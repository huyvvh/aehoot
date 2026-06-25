import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { updateDraftSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { id } = await params;
  const job = await prisma.generationJob.findFirst({
    where: { id, userId: user.userId },
    include: { document: { select: { id: true, filename: true } } },
  });
  if (!job) return apiError("Job không tồn tại", "JOB_NOT_FOUND", 404);

  return apiResponse(job);
}

// Lưu draft đã được người dùng chỉnh trong màn review.
export async function PATCH(
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
    return apiError("Chỉ sửa được khi đang chờ duyệt", "INVALID_STATE", 409);
  }

  const body = await req.json().catch(() => null);
  const parsed = updateDraftSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
  }

  const updated = await prisma.generationJob.update({
    where: { id },
    data: {
      draft: { questions: parsed.data.questions } as unknown as Prisma.InputJsonValue,
    },
  });

  return apiResponse(updated);
}
