import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { publishGenerationSchema, draftQuestionSchema } from "@/lib/validations";
import { z } from "zod";

/**
 * Cổng duyệt: tạo QuestionSet từ draft đã review.
 * Chỉ cho phép khi job đang ở trạng thái REVIEW (bắt buộc review thủ công).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { id } = await params;
  const job = await prisma.generationJob.findFirst({
    where: { id, userId: user.userId },
  });
  if (!job) return apiError("Job không tồn tại", "JOB_NOT_FOUND", 404);
  if (job.status !== "REVIEW") {
    return apiError("Job không ở trạng thái chờ duyệt", "INVALID_STATE", 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = publishGenerationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
  }
  const { title, description, isPublic, folderId } = parsed.data;

  // Validate draft đã lưu trên job (nguồn chân lý sau khi review/PATCH).
  const draftParsed = z
    .object({ questions: z.array(draftQuestionSchema).min(1) })
    .safeParse(job.draft);
  if (!draftParsed.success) {
    return apiError("Draft không hợp lệ để publish", "INVALID_DRAFT", 422);
  }
  const questions = draftParsed.data.questions;

  if (folderId) {
    const folder = await prisma.folder.findFirst({
      where: { id: folderId, userId: user.userId },
    });
    if (!folder) return apiError("Folder không tồn tại", "FOLDER_NOT_FOUND", 404);
  }

  const set = await prisma.$transaction(async (tx) => {
    const created = await tx.questionSet.create({
      data: {
        title,
        description,
        isPublic,
        authorId: user.userId,
        folderId: folderId ?? undefined,
        questions: {
          create: questions.map((q, qi) => ({
            text: q.text,
            timeLimit: q.timeLimit,
            points: q.points,
            order: qi,
            // Lưu truy vết nguồn để Agent giải thích đối chiếu (grounding) về sau.
            sourceQuote: q.sourceQuote || null,
            sourceChunkId: q.chunkId || null,
            answers: {
              create: q.answers.map((a, ai) => ({
                text: a.text,
                isCorrect: a.isCorrect,
                order: ai,
              })),
            },
          })),
        },
      },
    });

    await tx.generationJob.update({
      where: { id },
      data: { status: "DONE", progress: 100, questionSetId: created.id },
    });

    return created;
  });

  return apiResponse({ questionSetId: set.id }, 201);
}
