import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { llm, GLM_MODEL } from "./client";
import type { GenerationConfig } from "@/lib/validations";
import { redactPII } from "./pii";
import { checkGrounding, REJECT_THRESHOLD } from "./validate";
import { standardizeDraft } from "./standardize";

/** Giới hạn chi phí: số chunk tối đa xử lý cho 1 job. */
export const MAX_CHUNKS = 30;

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface DraftAnswer {
  text: string;
  isCorrect: boolean;
}

export interface DraftQuestion {
  text: string;
  answers: DraftAnswer[];
  difficulty: Difficulty;
  timeLimit: number;
  points: number;
  /** Trích dẫn nguyên văn từ tài liệu làm căn cứ cho đáp án đúng (truy vết). */
  sourceQuote: string;
  /** Chunk nguồn để đối chiếu. */
  chunkId: string;
  /** true nếu trích dẫn khớp đủ với tài liệu nguồn (grounding). */
  grounded: boolean;
}

export interface GenChunk {
  id: string;
  content: string;
}

/** Chuẩn hóa điểm/thời gian theo độ khó (nghiệp vụ vận hành). */
export function difficultyToScoring(d: Difficulty): {
  timeLimit: number;
  points: number;
} {
  switch (d) {
    case "EASY":
      return { timeLimit: 20, points: 100 };
    case "HARD":
      return { timeLimit: 30, points: 200 };
    case "MEDIUM":
    default:
      return { timeLimit: 25, points: 150 };
  }
}

const DIFFICULTY_GUIDE: Record<GenerationConfig["difficulty"], string> = {
  EASY: "Mức Nhận biết: hỏi định nghĩa, con số, quy định trực tiếp trong tài liệu.",
  MEDIUM: "Mức Thông hiểu: yêu cầu hiểu và phân biệt khái niệm, điều kiện áp dụng.",
  HARD: "Mức Vận dụng: tình huống nghiệp vụ thực tế, áp dụng quy định để xử lý.",
  MIXED: "Trộn nhiều mức độ (Nhận biết / Thông hiểu / Vận dụng) cho cân bằng.",
};

const submitTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "submit_questions",
    description: "Nộp danh sách câu hỏi trắc nghiệm đã sinh từ tài liệu.",
    parameters: {
      type: "object",
      properties: {
        questions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              text: { type: "string", description: "Nội dung câu hỏi" },
              difficulty: {
                type: "string",
                enum: ["EASY", "MEDIUM", "HARD"],
              },
              sourceQuote: {
                type: "string",
                description:
                  "Trích dẫn NGUYÊN VĂN câu/đoạn trong tài liệu làm căn cứ cho đáp án đúng",
              },
              answers: {
                type: "array",
                description:
                  "Các phương án; đúng MỘT phương án có isCorrect=true",
                items: {
                  type: "object",
                  properties: {
                    text: { type: "string" },
                    isCorrect: { type: "boolean" },
                  },
                  required: ["text", "isCorrect"],
                },
              },
            },
            required: ["text", "difficulty", "sourceQuote", "answers"],
          },
        },
      },
      required: ["questions"],
    },
  },
};

function systemPrompt(config: GenerationConfig): string {
  return [
    "Bạn là chuyên gia khảo thí nghiệp vụ trong lĩnh vực tài chính - ngân hàng.",
    "Nhiệm vụ: sinh câu hỏi trắc nghiệm để đào tạo nhân sự vận hành, CHỈ dựa trên nội dung tài liệu được cung cấp.",
    "",
    "QUY TẮC BẮT BUỘC:",
    "- TUYỆT ĐỐI không bịa thông tin ngoài tài liệu. Mỗi câu phải có căn cứ trong tài liệu.",
    `- Mỗi câu hỏi có đúng ${config.answersPerQuestion} phương án, trong đó CHỈ MỘT phương án đúng (isCorrect=true).`,
    "- Các phương án nhiễu phải hợp lý, cùng chủ đề, không lộ liễu.",
    "- 'sourceQuote' phải là trích dẫn nguyên văn từ tài liệu, là căn cứ cho đáp án đúng.",
    "- Dùng tiếng Việt, thuật ngữ nghiệp vụ chuẩn, câu hỏi rõ ràng, không mơ hồ.",
    config.domainHint ? `- Bối cảnh nghiệp vụ: ${config.domainHint}` : "",
    "",
    `Độ khó: ${DIFFICULTY_GUIDE[config.difficulty]}`,
    "Gọi hàm submit_questions để nộp kết quả.",
  ]
    .filter(Boolean)
    .join("\n");
}

interface RawQuestion {
  text?: string;
  difficulty?: string;
  sourceQuote?: string;
  answers?: { text?: string; isCorrect?: boolean }[];
}

/** Sinh câu hỏi từ MỘT chunk. Che PII trước khi gửi, kiểm grounding sau khi nhận. */
export async function generateFromChunk(
  chunk: GenChunk,
  count: number,
  config: GenerationConfig
): Promise<DraftQuestion[]> {
  // Che PII trước khi gửi lên LLM cloud.
  const redacted = redactPII(chunk.content);
  if (redacted.count > 0) {
    console.log(`[generator] đã che ${redacted.count} PII trong chunk ${chunk.id}`);
  }

  // GLM 5.2 bật "thinking" mặc định và tiêu hết token vào reasoning → tắt đi
  // để structured output (function calling) ổn định, nhanh và rẻ hơn.
  const params = {
    model: GLM_MODEL,
    temperature: 0.6,
    max_tokens: 4096,
    messages: [
      { role: "system", content: systemPrompt(config) },
      {
        role: "user",
        content: `Sinh ${count} câu hỏi trắc nghiệm từ đoạn tài liệu sau:\n\n"""\n${redacted.text}\n"""`,
      },
    ],
    tools: [submitTool],
    tool_choice: { type: "function", function: { name: "submit_questions" } },
    thinking: { type: "disabled" },
  } as ChatCompletionCreateParamsNonStreaming;

  const res = await llm.chat.completions.create(params);

  if (res.usage) {
    console.log(`[generator] chunk ${chunk.id} tokens=${res.usage.total_tokens}`);
  }

  const raw = extractToolArguments(res);
  const questions: RawQuestion[] = Array.isArray(raw?.questions)
    ? raw.questions
    : [];

  const out: DraftQuestion[] = [];
  for (const q of questions) {
    const normalized = normalizeQuestion(q, chunk.id, config);
    if (!normalized) continue;
    const { grounded, ratio } = checkGrounding(normalized.sourceQuote, redacted.text);
    // Overlap quá thấp = nghi bịa → loại bỏ hẳn.
    if (ratio < REJECT_THRESHOLD) continue;
    out.push({ ...normalized, grounded });
  }
  return out;
}

/**
 * Sinh đề từ nhiều chunk (map-reduce đơn giản cho MVP đồng bộ):
 * phân bổ số câu theo chunk, gộp, khử trùng lặp, cắt theo numQuestions.
 */
export async function generateQuestions(
  chunks: GenChunk[],
  config: GenerationConfig,
  onProgress?: (progress: number) => void | Promise<void>
): Promise<DraftQuestion[]> {
  if (chunks.length === 0) return [];

  // Phân bổ số câu cho từng chunk (tối thiểu 1/chunk, không vượt tổng).
  // Giới hạn số chunk để kiểm soát chi phí.
  const usable = chunks.slice(0, Math.min(config.numQuestions, MAX_CHUNKS));
  const perChunk = Math.max(1, Math.ceil(config.numQuestions / usable.length));

  const all: DraftQuestion[] = [];
  for (let i = 0; i < usable.length; i++) {
    if (all.length >= config.numQuestions) break;
    const remaining = config.numQuestions - all.length;
    try {
      const part = await generateFromChunk(
        usable[i],
        Math.min(perChunk, remaining),
        config
      );
      all.push(...part);
    } catch (err) {
      console.error(`[generator] chunk ${usable[i].id} failed`, err);
      // Bỏ qua chunk lỗi, tiếp tục để không hỏng cả job.
    }
    // Tiến độ: chừa 5% cuối cho bước chuẩn hóa/lưu.
    const progress = Math.min(95, Math.round(((i + 1) / usable.length) * 95));
    await onProgress?.(progress);
  }

  return standardizeDraft(all).slice(0, config.numQuestions);
}

// ── helpers ───────────────────────────────────────────────────

function extractToolArguments(
  res: ChatCompletion
): { questions?: RawQuestion[] } | null {
  const msg = res.choices[0]?.message;
  const toolCall = msg?.tool_calls?.[0];
  const argStr =
    toolCall && "function" in toolCall
      ? toolCall.function.arguments
      : msg?.content;
  if (!argStr) return null;
  try {
    return JSON.parse(argStr);
  } catch {
    return null;
  }
}

function normalizeQuestion(
  q: RawQuestion,
  chunkId: string,
  config: GenerationConfig
): Omit<DraftQuestion, "grounded"> | null {
  const text = q.text?.trim();
  const sourceQuote = q.sourceQuote?.trim();
  if (!text || !sourceQuote) return null;

  const answers = (q.answers ?? [])
    .map((a) => ({ text: a.text?.trim() ?? "", isCorrect: !!a.isCorrect }))
    .filter((a) => a.text);

  // Guardrail: phải có đúng 1 đáp án đúng và đủ số phương án.
  const correctCount = answers.filter((a) => a.isCorrect).length;
  if (answers.length < 2 || correctCount !== 1) return null;

  const trimmed = answers.slice(0, config.answersPerQuestion);
  if (!trimmed.some((a) => a.isCorrect)) return null; // đáp án đúng bị cắt mất

  const difficulty = normalizeDifficulty(q.difficulty);
  const scoring = difficultyToScoring(difficulty);

  return {
    text,
    answers: trimmed,
    difficulty,
    ...scoring,
    sourceQuote,
    chunkId,
  };
}

function normalizeDifficulty(d?: string): Difficulty {
  const up = (d ?? "").toUpperCase();
  return up === "EASY" || up === "HARD" ? up : "MEDIUM";
}
