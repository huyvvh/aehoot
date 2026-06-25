import { prisma } from "@/lib/prisma";
import { explainQuestion } from "./explainer";
import { overlapRatio } from "./validate";

/**
 * Agent bảo trì giải thích: quét các giải thích STALE (do tài liệu nguồn bị
 * thay thế) → sinh lại theo tài liệu HIỆN HÀNH → đưa về hàng chờ duyệt (REVIEW).
 * Gọi định kỳ qua cron, hoặc thủ công bởi người dùng cho riêng họ.
 */

/** Giới hạn số câu xử lý mỗi lần chạy để kiểm soát chi phí/thời gian. */
export const MAX_STALE_PER_RUN = 50;

interface ChunkLite {
  id: string;
  content: string;
}

export interface MaintenanceResult {
  scanned: number;
  regenerated: number;
  sets: number;
}

export async function regenerateStale(opts: {
  userId?: string;
  limit?: number;
}): Promise<MaintenanceResult> {
  const limit = opts.limit ?? MAX_STALE_PER_RUN;

  const stale = await prisma.questionExplanation.findMany({
    where: {
      status: "STALE",
      ...(opts.userId
        ? { question: { questionSet: { authorId: opts.userId } } }
        : {}),
    },
    take: limit,
    include: {
      question: {
        select: {
          id: true,
          text: true,
          sourceQuote: true,
          questionSetId: true,
          questionSet: { select: { authorId: true } },
          answers: {
            orderBy: { order: "asc" },
            select: { text: true, isCorrect: true },
          },
        },
      },
    },
  });

  // setId → { authorId, count } để tạo job review sau khi sinh lại.
  const affected = new Map<string, { authorId: string; count: number }>();
  // Cache theo tài liệu để không nạp chunk lặp lại.
  const docIdCache = new Map<string, string>();
  const chunkCache = new Map<string, ChunkLite[]>();

  let regenerated = 0;

  for (const expl of stale) {
    const q = expl.question;
    try {
      // Xác định tài liệu hiện hành (lần theo chuỗi thay thế).
      let currentDocId: string | null = null;
      if (expl.basedOnDocumentId) {
        if (!docIdCache.has(expl.basedOnDocumentId)) {
          docIdCache.set(
            expl.basedOnDocumentId,
            await currentEffectiveDocId(expl.basedOnDocumentId)
          );
        }
        currentDocId = docIdCache.get(expl.basedOnDocumentId)!;
      }

      // Chọn chunk khớp nhất trong tài liệu hiện hành làm căn cứ mới.
      let sourceText: string | null = null;
      let sourceChunkId: string | null = null;
      if (currentDocId) {
        if (!chunkCache.has(currentDocId)) {
          chunkCache.set(currentDocId, await loadChunks(currentDocId));
        }
        const best = pickBestChunk(
          q.sourceQuote || q.text,
          chunkCache.get(currentDocId)!
        );
        sourceText = best?.content ?? null;
        sourceChunkId = best?.id ?? null;
      }

      const result = await explainQuestion({
        questionText: q.text,
        answers: q.answers,
        sourceText,
      });
      const status = result.grounded ? "DRAFT" : "NEEDS_REVIEW";

      await prisma.$transaction(async (tx) => {
        await tx.questionExplanation.update({
          where: { id: expl.id },
          data: {
            body: result.body,
            grounded: result.grounded,
            status,
            basedOnDocumentId: currentDocId,
            reviewedAt: null,
            reviewedById: null,
          },
        });
        await tx.explanationCitation.deleteMany({
          where: { explanationId: expl.id },
        });
        if (result.citationQuote) {
          await tx.explanationCitation.create({
            data: {
              explanationId: expl.id,
              quote: result.citationQuote,
              chunkId: sourceChunkId,
              documentId: currentDocId,
            },
          });
        }
      });

      regenerated++;
      const prev = affected.get(q.questionSetId);
      affected.set(q.questionSetId, {
        authorId: q.questionSet.authorId,
        count: (prev?.count ?? 0) + 1,
      });
    } catch (err) {
      console.error(`[maintenance] câu ${q.id} sinh lại lỗi`, err);
      // Bỏ qua câu lỗi, giữ nguyên STALE để lần chạy sau thử lại.
    }
  }

  // Tạo job REVIEW cho mỗi bộ đề có giải thích vừa sinh lại → hiện ở hàng chờ duyệt.
  for (const [questionSetId, info] of affected) {
    await prisma.explanationJob.create({
      data: {
        userId: info.authorId,
        questionSetId,
        status: "REVIEW",
        progress: 100,
        total: info.count,
        done: info.count,
      },
    });
  }

  return { scanned: stale.length, regenerated, sets: affected.size };
}

// ── helpers ───────────────────────────────────────────────────

/** Lần theo chuỗi supersededBy tới tài liệu cuối cùng (hiện hành). */
async function currentEffectiveDocId(startId: string): Promise<string> {
  let id = startId;
  const seen = new Set<string>();
  while (!seen.has(id)) {
    seen.add(id);
    const doc = await prisma.sourceDocument.findUnique({
      where: { id },
      select: { supersededById: true },
    });
    if (!doc?.supersededById) break;
    id = doc.supersededById;
  }
  return id;
}

async function loadChunks(documentId: string): Promise<ChunkLite[]> {
  return prisma.documentChunk.findMany({
    where: { documentId },
    select: { id: true, content: true },
    orderBy: { order: "asc" },
  });
}

/** Chunk có độ trùng token cao nhất với câu truy vấn; null nếu không có chunk. */
function pickBestChunk(query: string, chunks: ChunkLite[]): ChunkLite | null {
  let best: ChunkLite | null = null;
  let bestScore = -1;
  for (const c of chunks) {
    const score = overlapRatio(query, c.content);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}
