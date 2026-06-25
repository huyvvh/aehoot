import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { supersedeDocumentSchema } from "@/lib/validations";

/**
 * Đánh dấu tài liệu hiện tại đã bị một bản MỚI thay thế.
 * Hệ quả: mọi giải thích lấy căn cứ từ bản cũ bị gắn cờ STALE — tự động ngừng
 * hiện trong game (game chỉ lộ giải thích CURRENT) cho tới khi sinh lại & duyệt.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { id } = await params;
  const oldDoc = await prisma.sourceDocument.findFirst({
    where: { id, userId: user.userId },
  });
  if (!oldDoc) return apiError("Tài liệu không tồn tại", "DOC_NOT_FOUND", 404);

  const body = await req.json().catch(() => null);
  const parsed = supersedeDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
  }
  const { supersededById } = parsed.data;

  if (supersededById === id) {
    return apiError("Không thể tự thay thế chính nó", "INVALID_TARGET");
  }
  const newDoc = await prisma.sourceDocument.findFirst({
    where: { id: supersededById, userId: user.userId },
  });
  if (!newDoc) {
    return apiError("Tài liệu thay thế không tồn tại", "TARGET_NOT_FOUND", 404);
  }

  const [, staled] = await prisma.$transaction([
    prisma.sourceDocument.update({
      where: { id },
      data: { regStatus: "SUPERSEDED", supersededById },
    }),
    // Gắn cờ giải thích còn hiệu lực/đang chờ dựa trên bản cũ → cần cập nhật.
    prisma.questionExplanation.updateMany({
      where: {
        basedOnDocumentId: id,
        status: { in: ["CURRENT", "DRAFT", "NEEDS_REVIEW"] },
      },
      data: { status: "STALE" },
    }),
  ]);

  return apiResponse({ supersededById, staledCount: staled.count });
}
