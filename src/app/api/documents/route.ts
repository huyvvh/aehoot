import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { extractText, isSupportedFilename } from "@/lib/ai/extract";
import { chunkText } from "@/lib/ai/chunk";

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const docs = await prisma.sourceDocument.findMany({
    where: { userId: user.userId },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      status: true,
      createdAt: true,
      regulationCode: true,
      effectiveDate: true,
      regStatus: true,
      supersededById: true,
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiResponse(docs);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return apiError("Chưa có file", "NO_FILE");

  if (!isSupportedFilename(file.name)) {
    return apiError("Chỉ hỗ trợ file .docx và .xlsx", "UNSUPPORTED_FORMAT");
  }
  if (file.size > MAX_FILE_BYTES) {
    return apiError("File quá lớn (tối đa 10MB)", "FILE_TOO_LARGE");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawText: string;
  try {
    rawText = await extractText(buffer, file.name);
  } catch (err) {
    console.error("[documents] extract failed", err);
    return apiError("Không đọc được nội dung file", "EXTRACT_FAILED", 422);
  }

  if (!rawText.trim()) {
    return apiError("File không có nội dung văn bản", "EMPTY_DOCUMENT", 422);
  }

  const chunks = chunkText(rawText);

  const doc = await prisma.sourceDocument.create({
    data: {
      userId: user.userId,
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      rawText,
      status: "CHUNKED",
      chunks: {
        create: chunks.map((content, order) => ({ order, content })),
      },
    },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      status: true,
      createdAt: true,
      regulationCode: true,
      effectiveDate: true,
      regStatus: true,
      supersededById: true,
      _count: { select: { chunks: true } },
    },
  });

  return apiResponse(doc, 201);
}
