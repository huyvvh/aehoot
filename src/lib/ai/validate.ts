/**
 * Grounding guardrail: kiểm tra câu hỏi có thật sự bắt nguồn từ tài liệu hay không.
 * Với nghiệp vụ tài chính, đây là tuyến phòng thủ chống "bịa" (hallucination).
 *
 * Cách làm: chuẩn hóa text (bỏ dấu câu, gộp khoảng trắng, lowercase) rồi đo
 * mức độ trùng lặp giữa sourceQuote và nội dung chunk gốc.
 */

export function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tỉ lệ token của quote xuất hiện trong chunk (0..1). */
export function overlapRatio(quote: string, chunk: string): number {
  const q = normalizeForMatch(quote);
  const c = normalizeForMatch(chunk);
  if (!q) return 0;

  // Trùng nguyên cụm → chắc chắn grounded.
  if (c.includes(q)) return 1;

  const cTokens = new Set(c.split(" "));
  const qTokens = q.split(" ").filter(Boolean);
  if (qTokens.length === 0) return 0;

  let hit = 0;
  for (const t of qTokens) if (cTokens.has(t)) hit++;
  return hit / qTokens.length;
}

export interface GroundingResult {
  grounded: boolean;
  ratio: number;
}

/**
 * grounded = true nếu overlap >= GROUNDED_THRESHOLD.
 * Trả về ratio để có thể loại bỏ câu quá lệch (overlap rất thấp = nghi bịa).
 */
export const GROUNDED_THRESHOLD = 0.6;
export const REJECT_THRESHOLD = 0.3;

export function checkGrounding(quote: string, chunk: string): GroundingResult {
  const ratio = overlapRatio(quote, chunk);
  return { grounded: ratio >= GROUNDED_THRESHOLD, ratio };
}
