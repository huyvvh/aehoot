import type { DraftQuestion, Difficulty } from "./generator";
import { difficultyToScoring } from "./generator";

/**
 * Taxonomy chuẩn hóa theo nghiệp vụ vận hành. Để vận hành điều chỉnh
 * mà không phải sửa logic sinh đề.
 */
export const TAXONOMY = {
  difficulties: ["EASY", "MEDIUM", "HARD"] as Difficulty[],
  // Mức Bloom tương ứng (hiển thị/đào tạo)
  bloom: {
    EASY: "Nhận biết",
    MEDIUM: "Thông hiểu",
    HARD: "Vận dụng",
  } as Record<Difficulty, string>,
} as const;

/**
 * Lớp chuẩn hóa cuối: đảm bảo điểm/thời gian khớp độ khó, làm sạch khoảng
 * trắng thừa, và bỏ câu trùng. Idempotent — gọi nhiều lần vẫn an toàn.
 */
export function standardizeDraft(questions: DraftQuestion[]): DraftQuestion[] {
  const seen = new Set<string>();
  const out: DraftQuestion[] = [];

  for (const q of questions) {
    const text = collapse(q.text);
    if (!text) continue;

    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const scoring = difficultyToScoring(q.difficulty);
    out.push({
      ...q,
      text,
      ...scoring, // ép điểm/thời gian theo độ khó (chuẩn hóa nhất quán)
      answers: q.answers.map((a) => ({ ...a, text: collapse(a.text) })),
      sourceQuote: collapse(q.sourceQuote),
    });
  }

  return out;
}

/** Phân bố độ khó hiện tại — dùng để báo cáo/cân bằng. */
export function difficultyDistribution(
  questions: DraftQuestion[]
): Record<Difficulty, number> {
  const dist: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const q of questions) dist[q.difficulty]++;
  return dist;
}

function collapse(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
