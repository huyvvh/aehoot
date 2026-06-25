import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { updateExplanationsSchema } from "@/lib/validations";

// Poll tiến độ job + trả kèm câu hỏi và giải thích để dựng màn review.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { id } = await params;
  const job = await prisma.explanationJob.findFirst({
    where: { id, userId: user.userId },
    include: { questionSet: { select: { id: true, title: true } } },
  });
  if (!job) return apiError("Job không tồn tại", "JOB_NOT_FOUND", 404);

  // Chỉ tải nội dung câu hỏi/giải thích khi đã sinh xong (REVIEW/DONE).
  const questions =
    job.status === "REVIEW" || job.status === "DONE"
      ? await prisma.question.findMany({
          where: { questionSetId: job.questionSetId },
          orderBy: { order: "asc" },
          select: {
            id: true,
            text: true,
            answers: {
              orderBy: { order: "asc" },
              select: { text: true, isCorrect: true },
            },
            explanation: {
              select: {
                body: true,
                status: true,
                grounded: true,
                citations: { select: { quote: true } },
              },
            },
          },
        })
      : [];

  return apiResponse({ job, questions });
}

// Lưu nội dung giải thích đã chỉnh trong màn review (chỉ khi job đang REVIEW).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { id } = await params;
  const job = await prisma.explanationJob.findFirst({
    where: { id, userId: user.userId },
  });
  if (!job) return apiError("Job không tồn tại", "JOB_NOT_FOUND", 404);
  if (job.status !== "REVIEW") {
    return apiError("Chỉ sửa được khi đang chờ duyệt", "INVALID_STATE", 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateExplanationsSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
  }

  // Chỉ cho cập nhật các câu thuộc bộ câu hỏi của job này.
  const validIds = new Set(
    (
      await prisma.question.findMany({
        where: { questionSetId: job.questionSetId },
        select: { id: true },
      })
    ).map((q) => q.id)
  );

  await prisma.$transaction(
    parsed.data.explanations
      .filter((e) => validIds.has(e.questionId))
      .map((e) =>
        prisma.questionExplanation.update({
          where: { questionId: e.questionId },
          data: { body: e.body },
        })
      )
  );

  return apiResponse({ ok: true });
}
