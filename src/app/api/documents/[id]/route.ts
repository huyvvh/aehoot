import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { updateDocumentSchema } from "@/lib/validations";

// Cập nhật metadata phiên bản hóa: mã văn bản quy định + ngày hiệu lực.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { id } = await params;
  const doc = await prisma.sourceDocument.findFirst({
    where: { id, userId: user.userId },
  });
  if (!doc) return apiError("Tài liệu không tồn tại", "DOC_NOT_FOUND", 404);

  const body = await req.json().catch(() => null);
  const parsed = updateDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
  }

  const { regulationCode, effectiveDate } = parsed.data;
  const updated = await prisma.sourceDocument.update({
    where: { id },
    data: {
      ...(regulationCode !== undefined ? { regulationCode } : {}),
      ...(effectiveDate !== undefined
        ? { effectiveDate: effectiveDate ? new Date(effectiveDate) : null }
        : {}),
    },
    select: {
      id: true,
      regulationCode: true,
      effectiveDate: true,
      regStatus: true,
    },
  });

  return apiResponse(updated);
}
