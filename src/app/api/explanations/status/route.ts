import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";

// Tóm tắt trạng thái giải thích của một bộ đề (phục vụ cảnh báo STALE trên UI).
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const questionSetId = req.nextUrl.searchParams.get("questionSetId");
  if (!questionSetId) return apiError("Thiếu questionSetId", "VALIDATION_ERROR");

  const set = await prisma.questionSet.findFirst({
    where: { id: questionSetId, authorId: user.userId },
    select: { _count: { select: { questions: true } } },
  });
  if (!set) return apiError("Bộ câu hỏi không tồn tại", "SET_NOT_FOUND", 404);

  const grouped = await prisma.questionExplanation.groupBy({
    by: ["status"],
    where: { question: { questionSetId } },
    _count: { _all: true },
  });

  const counts = { CURRENT: 0, STALE: 0, NEEDS_REVIEW: 0, DRAFT: 0 };
  for (const g of grouped) {
    counts[g.status as keyof typeof counts] = g._count._all;
  }
  const withExplanation =
    counts.CURRENT + counts.STALE + counts.NEEDS_REVIEW + counts.DRAFT;

  return apiResponse({
    total: set._count.questions,
    withExplanation,
    ...counts,
  });
}
