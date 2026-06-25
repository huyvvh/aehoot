import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";

/**
 * Cổng duyệt: đánh dấu giải thích là CURRENT (đang hiệu lực).
 * Chỉ cho phép khi job đang REVIEW — bắt buộc review thủ công trước khi lên.
 */
export async function POST(
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
    return apiError("Job không ở trạng thái chờ duyệt", "INVALID_STATE", 409);
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.questionExplanation.updateMany({
      where: { question: { questionSetId: job.questionSetId } },
      data: { status: "CURRENT", reviewedAt: now, reviewedById: user.userId },
    }),
    prisma.explanationJob.update({
      where: { id },
      data: { status: "DONE" },
    }),
  ]);

  return apiResponse({ ok: true });
}
