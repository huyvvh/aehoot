import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import {
  createGenerationSchema,
  generationConfigSchema,
} from "@/lib/validations";
import { generateQuestions, type GenChunk } from "@/lib/ai/generator";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const jobs = await prisma.generationJob.findMany({
    where: { userId: user.userId },
    select: {
      id: true,
      status: true,
      progress: true,
      questionSetId: true,
      createdAt: true,
      document: { select: { id: true, filename: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return apiResponse(jobs);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = await req.json().catch(() => null);
  const parsed = createGenerationSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
  }
  const config = parsed.data.config ?? generationConfigSchema.parse({});

  // Gom danh sách tài liệu (1 hoặc nhiều), giữ thứ tự tải lên.
  const requestedIds =
    parsed.data.documentIds ??
    (parsed.data.documentId ? [parsed.data.documentId] : []);

  const docs = await prisma.sourceDocument.findMany({
    where: { id: { in: requestedIds }, userId: user.userId },
    include: { chunks: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  if (docs.length === 0) {
    return apiError("Tài liệu không tồn tại", "DOC_NOT_FOUND", 404);
  }

  // Đan xen chunk giữa các tài liệu (round-robin): doc1[0], doc2[0], doc1[1]...
  // Nhờ vậy khi generator giới hạn số chunk, mọi tài liệu đều được phủ thay vì
  // chỉ rút từ tài liệu đầu. Mỗi chunk vẫn giữ id riêng → grounding/trích dẫn
  // vẫn truy đúng tài liệu nguồn của từng câu.
  const chunks: GenChunk[] = [];
  const maxLen = Math.max(...docs.map((d) => d.chunks.length));
  for (let i = 0; i < maxLen; i++) {
    for (const d of docs) {
      const c = d.chunks[i];
      if (c) chunks.push({ id: c.id, content: c.content });
    }
  }
  if (chunks.length === 0) {
    return apiError("Tài liệu chưa có nội dung để sinh đề", "DOC_EMPTY", 422);
  }

  // Chặn chạy song song nhiều job/người dùng để kiểm soát chi phí.
  const running = await prisma.generationJob.findFirst({
    where: { userId: user.userId, status: "PROCESSING" },
  });
  if (running) {
    return apiError(
      "Bạn đang có một job sinh đề chạy dở, vui lòng đợi",
      "JOB_IN_PROGRESS",
      409
    );
  }

  const job = await prisma.generationJob.create({
    data: {
      userId: user.userId,
      // FK trỏ tài liệu đầu tiên (đại diện); chunk đã gộp đủ các tài liệu.
      documentId: docs[0].id,
      config,
      status: "PROCESSING",
    },
  });

  // Chạy nền (không await): server custom (tsx server.ts) là tiến trình
  // dài hạn nên promise nổi vẫn tiếp tục. Client poll tiến độ qua GET job.
  void runGeneration(job.id, chunks, config);

  return apiResponse(job, 202);
}

async function runGeneration(
  jobId: string,
  chunks: GenChunk[],
  config: ReturnType<typeof generationConfigSchema.parse>
) {
  try {
    const draft = await generateQuestions(chunks, config, async (progress) => {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { progress },
      });
    });

    if (draft.length === 0) {
      await prisma.generationJob.update({
        where: { id: jobId },
        data: { status: "FAILED", error: "Không sinh được câu hỏi hợp lệ" },
      });
      return;
    }

    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "REVIEW",
        progress: 100,
        draft: { questions: draft } as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    console.error("[generate] job failed", err);
    await prisma.generationJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message : "Lỗi sinh đề",
      },
    });
  }
}
