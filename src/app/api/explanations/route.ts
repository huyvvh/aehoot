import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { createExplanationSchema } from "@/lib/validations";
import { explainQuestion } from "@/lib/ai/explainer";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const jobs = await prisma.explanationJob.findMany({
    where: { userId: user.userId },
    select: {
      id: true,
      status: true,
      progress: true,
      total: true,
      done: true,
      createdAt: true,
      questionSet: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiResponse(jobs);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = await req.json().catch(() => null);
  const parsed = createExplanationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
  }
  const { questionSetId } = parsed.data;

  const set = await prisma.questionSet.findFirst({
    where: { id: questionSetId, authorId: user.userId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        include: { answers: { orderBy: { order: "asc" } } },
      },
    },
  });
  if (!set) return apiError("Bộ câu hỏi không tồn tại", "SET_NOT_FOUND", 404);
  if (set.questions.length === 0) {
    return apiError("Bộ câu hỏi chưa có câu nào", "SET_EMPTY", 422);
  }

  // Chặn chạy song song nhiều job/người dùng để kiểm soát chi phí.
  const running = await prisma.explanationJob.findFirst({
    where: { userId: user.userId, status: "PROCESSING" },
  });
  if (running) {
    return apiError(
      "Bạn đang có một job giải thích chạy dở, vui lòng đợi",
      "JOB_IN_PROGRESS",
      409
    );
  }

  const job = await prisma.explanationJob.create({
    data: {
      userId: user.userId,
      questionSetId,
      status: "PROCESSING",
      total: set.questions.length,
    },
  });

  const questions = set.questions.map((q) => ({
    id: q.id,
    text: q.text,
    sourceChunkId: q.sourceChunkId,
    answers: q.answers.map((a) => ({ text: a.text, isCorrect: a.isCorrect })),
  }));

  // Chạy nền (server custom dài hạn). Client poll tiến độ qua GET job.
  void runExplanation(job.id, questions);

  return apiResponse(job, 202);
}

type JobQuestion = {
  id: string;
  text: string;
  sourceChunkId: string | null;
  answers: { text: string; isCorrect: boolean }[];
};

async function runExplanation(jobId: string, questions: JobQuestion[]) {
  try {
    let done = 0;
    for (const q of questions) {
      // Lấy nội dung tài liệu nguồn để đối chiếu (nếu câu hỏi sinh từ tài liệu).
      let sourceText: string | null = null;
      let sourceDocumentId: string | null = null;
      if (q.sourceChunkId) {
        const chunk = await prisma.documentChunk.findUnique({
          where: { id: q.sourceChunkId },
          select: { content: true, documentId: true },
        });
        sourceText = chunk?.content ?? null;
        sourceDocumentId = chunk?.documentId ?? null;
      }

      try {
        const result = await explainQuestion({
          questionText: q.text,
          answers: q.answers,
          sourceText,
        });

        // Không grounded (thiếu nguồn / trích dẫn lệch) → cần soát kỹ.
        const status = result.grounded ? "DRAFT" : "NEEDS_REVIEW";

        await prisma.$transaction(async (tx) => {
          const expl = await tx.questionExplanation.upsert({
            where: { questionId: q.id },
            create: {
              questionId: q.id,
              body: result.body,
              grounded: result.grounded,
              status,
              basedOnDocumentId: sourceDocumentId,
            },
            update: {
              body: result.body,
              grounded: result.grounded,
              status,
              basedOnDocumentId: sourceDocumentId,
              reviewedAt: null,
              reviewedById: null,
            },
          });
          // Thay toàn bộ trích dẫn cũ bằng trích dẫn mới.
          await tx.explanationCitation.deleteMany({
            where: { explanationId: expl.id },
          });
          if (result.citationQuote) {
            await tx.explanationCitation.create({
              data: {
                explanationId: expl.id,
                quote: result.citationQuote,
                chunkId: q.sourceChunkId,
                documentId: sourceDocumentId,
              },
            });
          }
        });
      } catch (err) {
        console.error(`[explanations] câu ${q.id} lỗi`, err);
        // Bỏ qua câu lỗi để không hỏng cả job.
      }

      done++;
      await prisma.explanationJob.update({
        where: { id: jobId },
        data: { done, progress: Math.round((done / questions.length) * 100) },
      });
    }

    // Sinh xong → chờ người duyệt (review bắt buộc).
    await prisma.explanationJob.update({
      where: { id: jobId },
      data: { status: "REVIEW", progress: 100 },
    });
  } catch (err) {
    console.error("[explanations] job failed", err);
    await prisma.explanationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : "Lỗi sinh giải thích",
      },
    });
  }
}
