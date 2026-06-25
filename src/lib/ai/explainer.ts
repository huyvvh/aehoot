import type {
  ChatCompletion,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { llm, GLM_MODEL } from "./client";
import { redactPII } from "./pii";
import { checkGrounding } from "./validate";

/**
 * Agent giải thích đáp án: với mỗi câu hỏi, sinh phần giải thích "vì sao đáp án
 * đúng / vì sao các phương án khác sai", CHỈ dựa trên tài liệu nguồn, kèm trích
 * dẫn nguyên văn để truy vết. Tái dùng grounding + che PII như generator.
 */

export interface ExplainAnswer {
  text: string;
  isCorrect: boolean;
}

export interface ExplainInput {
  questionText: string;
  answers: ExplainAnswer[];
  /** Nội dung chunk tài liệu làm căn cứ (nếu câu hỏi sinh từ tài liệu). */
  sourceText?: string | null;
}

export interface ExplainResult {
  body: string;
  /** Trích dẫn nguyên văn làm căn cứ; rỗng nếu không có nguồn. */
  citationQuote: string;
  /** true nếu trích dẫn khớp đủ với tài liệu nguồn. */
  grounded: boolean;
}

const explainTool: ChatCompletionTool = {
  type: "function",
  function: {
    name: "submit_explanation",
    description: "Nộp phần giải thích đáp án kèm trích dẫn nguồn.",
    parameters: {
      type: "object",
      properties: {
        explanation: {
          type: "string",
          description:
            "Giải thích vì sao đáp án đúng là đúng và vì sao các phương án còn lại sai, dựa trên tài liệu.",
        },
        sourceQuote: {
          type: "string",
          description:
            "Trích dẫn NGUYÊN VĂN câu/đoạn trong tài liệu làm căn cứ. Để trống nếu không có tài liệu nguồn.",
        },
      },
      required: ["explanation"],
    },
  },
};

function systemPrompt(hasSource: boolean): string {
  return [
    "Bạn là chuyên gia khảo thí nghiệp vụ tài chính - ngân hàng.",
    "Nhiệm vụ: giải thích ngắn gọn, chính xác vì sao đáp án đúng là đúng và vì sao các phương án còn lại sai.",
    "",
    "QUY TẮC:",
    hasSource
      ? "- CHỈ dựa trên tài liệu được cung cấp; TUYỆT ĐỐI không bịa thông tin ngoài tài liệu."
      : "- Không có tài liệu nguồn: giải thích dựa trên kiến thức nghiệp vụ chuẩn, KHÔNG bịa con số/điều khoản cụ thể.",
    hasSource
      ? "- 'sourceQuote' phải là trích dẫn nguyên văn từ tài liệu, là căn cứ cho giải thích."
      : "- Để 'sourceQuote' trống.",
    "- Dùng tiếng Việt, thuật ngữ nghiệp vụ chuẩn, giải thích rõ ràng, súc tích (3-6 câu).",
    "Gọi hàm submit_explanation để nộp kết quả.",
  ]
    .filter(Boolean)
    .join("\n");
}

function userPrompt(input: ExplainInput, redactedSource: string): string {
  const correct = input.answers.filter((a) => a.isCorrect).map((a) => a.text);
  const wrong = input.answers.filter((a) => !a.isCorrect).map((a) => a.text);
  const parts = [
    `Câu hỏi: ${input.questionText}`,
    `Đáp án đúng: ${correct.join("; ") || "(không xác định)"}`,
    `Các phương án khác: ${wrong.join("; ") || "(không có)"}`,
  ];
  if (redactedSource) {
    parts.push("", `Tài liệu nguồn:\n"""\n${redactedSource}\n"""`);
  }
  return parts.join("\n");
}

/** Sinh giải thích cho MỘT câu hỏi. Che PII trước khi gửi, kiểm grounding sau. */
export async function explainQuestion(
  input: ExplainInput
): Promise<ExplainResult> {
  const redacted = input.sourceText ? redactPII(input.sourceText) : null;
  const sourceText = redacted?.text ?? "";
  const hasSource = sourceText.length > 0;

  const params = {
    model: GLM_MODEL,
    temperature: 0.4,
    max_tokens: 1024,
    messages: [
      { role: "system", content: systemPrompt(hasSource) },
      { role: "user", content: userPrompt(input, sourceText) },
    ],
    tools: [explainTool],
    tool_choice: { type: "function", function: { name: "submit_explanation" } },
    thinking: { type: "disabled" },
  } as ChatCompletionCreateParamsNonStreaming;

  const res = await llm.chat.completions.create(params);
  if (res.usage) {
    console.log(`[explainer] tokens=${res.usage.total_tokens}`);
  }

  const raw = extractToolArguments(res);
  const body = (raw?.explanation ?? "").trim();
  const citationQuote = (raw?.sourceQuote ?? "").trim();

  if (!body) {
    throw new Error("LLM không trả về nội dung giải thích");
  }

  // Không có nguồn, hoặc có nguồn nhưng trích dẫn không khớp → coi là chưa grounded.
  let grounded = false;
  if (hasSource && citationQuote) {
    grounded = checkGrounding(citationQuote, sourceText).grounded;
  }

  return { body, citationQuote, grounded };
}

// ── helpers ───────────────────────────────────────────────────

interface RawExplanation {
  explanation?: string;
  sourceQuote?: string;
}

function extractToolArguments(res: ChatCompletion): RawExplanation | null {
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
