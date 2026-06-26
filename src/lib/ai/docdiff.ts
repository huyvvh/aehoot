import { overlapRatio } from "./validate";

/**
 * So sánh nội dung 2 phiên bản tài liệu để phát hiện thay đổi, tránh sinh đề
 * theo nội dung lỗi thời. Tái dùng overlapRatio (token-overlap) làm thước đo
 * tương đồng — chạy cục bộ, không gọi LLM.
 */

// Ngưỡng tương đồng câu: >= UNCHANGED coi như không đổi; trong [CHANGED, UNCHANGED)
// coi là đã sửa; < CHANGED coi là mới/đã xóa.
export const SENTENCE_UNCHANGED = 0.85;
export const SENTENCE_CHANGED = 0.4;
// Chunk có overlap với toàn văn bên kia < ngưỡng này coi như "có thay đổi".
export const CHUNK_CHANGED_BELOW = 0.8;

// Số câu tối đa mỗi tài liệu đưa vào diff (chặn chi phí với tài liệu quá lớn).
const MAX_SENTENCES = 600;

export function splitSentences(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!?…;:])\s+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8)
    .slice(0, MAX_SENTENCES);
}

export interface SentenceDiff {
  added: string[]; // câu chỉ có ở bản mới
  removed: string[]; // câu chỉ có ở bản cũ
  changed: { old: string; new: string }[]; // câu khớp một phần (đã chỉnh)
  unchanged: number;
}

/** Diff mức câu giữa bản cũ và bản mới. */
export function diffSentences(oldText: string, newText: string): SentenceDiff {
  const oldS = splitSentences(oldText);
  const newS = splitSentences(newText);

  const added: string[] = [];
  const changed: { old: string; new: string }[] = [];
  const matchedOld = new Set<number>();
  let unchanged = 0;

  for (const ns of newS) {
    let bestIdx = -1;
    let best = 0;
    for (let i = 0; i < oldS.length; i++) {
      if (matchedOld.has(i)) continue;
      const r = overlapRatio(ns, oldS[i]);
      if (r > best) {
        best = r;
        bestIdx = i;
      }
    }
    if (best >= SENTENCE_UNCHANGED) {
      matchedOld.add(bestIdx);
      unchanged++;
    } else if (best >= SENTENCE_CHANGED && bestIdx >= 0) {
      matchedOld.add(bestIdx);
      changed.push({ old: oldS[bestIdx], new: ns });
    } else {
      added.push(ns);
    }
  }

  const removed = oldS.filter((_, i) => !matchedOld.has(i));
  return { added, removed, changed, unchanged };
}

export interface ChunkLite {
  id: string;
  content: string;
}

/**
 * Trả về id các chunk (của `chunks`) có nội dung KHÔNG còn xuất hiện đủ trong
 * `otherFullText` → tức là phần mới/đã sửa so với bên kia.
 * - Dùng cho sinh đề: lọc chunk MỚI/ĐÃ SỬA của bản mới (otherFullText = bản cũ).
 * - Dùng cho gắn cờ: lọc chunk cũ ĐÃ ĐỔI/XÓA (otherFullText = bản mới).
 */
export function chunkIdsWithChanges(
  chunks: ChunkLite[],
  otherFullText: string,
  threshold = CHUNK_CHANGED_BELOW
): string[] {
  return chunks
    .filter((c) => overlapRatio(c.content, otherFullText) < threshold)
    .map((c) => c.id);
}
