import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { diffSentences } from "@/lib/ai/docdiff";

// So sánh nội dung bản cũ (oldId) với bản mới (newId), trả báo cáo diff mức câu.
export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const oldId = req.nextUrl.searchParams.get("oldId");
  const newId = req.nextUrl.searchParams.get("newId");
  if (!oldId || !newId) {
    return apiError("Thiếu oldId hoặc newId", "VALIDATION_ERROR");
  }
  if (oldId === newId) {
    return apiError("Hai tài liệu trùng nhau", "INVALID_TARGET");
  }

  const docs = await prisma.sourceDocument.findMany({
    where: { id: { in: [oldId, newId] }, userId: user.userId },
    select: { id: true, filename: true, rawText: true },
  });
  const oldDoc = docs.find((d) => d.id === oldId);
  const newDoc = docs.find((d) => d.id === newId);
  if (!oldDoc || !newDoc) {
    return apiError("Tài liệu không tồn tại", "DOC_NOT_FOUND", 404);
  }

  const diff = diffSentences(oldDoc.rawText, newDoc.rawText);

  return apiResponse({
    oldDoc: { id: oldDoc.id, filename: oldDoc.filename },
    newDoc: { id: newDoc.id, filename: newDoc.filename },
    summary: {
      added: diff.added.length,
      removed: diff.removed.length,
      changed: diff.changed.length,
      unchanged: diff.unchanged,
    },
    diff,
  });
}
