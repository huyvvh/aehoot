import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  username: z
    .string()
    .min(3, "Username tối thiểu 3 ký tự")
    .max(20, "Username tối đa 20 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Username chỉ chứa chữ, số và dấu gạch dưới"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  displayName: z.string().min(1, "Tên hiển thị không được trống").max(50),
});

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export const questionSetSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được trống").max(200),
  description: z.string().max(1000).optional(),
  coverImage: z.string().url().optional().nullable(),
  isPublic: z.boolean().default(true),
  folderId: z.string().optional().nullable(),
  questions: z
    .array(
      z.object({
        text: z.string().min(1, "Câu hỏi không được trống"),
        imageUrl: z.string().url().optional().nullable(),
        timeLimit: z.number().min(5).max(120).default(20),
        points: z.number().min(10).max(1000).default(100),
        answers: z
          .array(
            z.object({
              text: z.string().min(1, "Đáp án không được trống"),
              isCorrect: z.boolean().default(false),
            })
          )
          .min(2, "Tối thiểu 2 đáp án")
          .max(4, "Tối đa 4 đáp án"),
      })
    )
    .min(1, "Tối thiểu 1 câu hỏi"),
});

export const folderSchema = z.object({
  name: z.string().min(1, "Tên folder không được trống").max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#6366f1"),
});

export const generationConfigSchema = z.object({
  numQuestions: z.number().int().min(1).max(50).default(10),
  difficulty: z
    .enum(["EASY", "MEDIUM", "HARD", "MIXED"])
    .default("MIXED"),
  language: z.string().default("vi"),
  answersPerQuestion: z.number().int().min(2).max(4).default(4),
  // Bối cảnh nghiệp vụ để chuẩn hóa giọng văn / thuật ngữ
  domainHint: z.string().max(500).optional(),
});

export const createGenerationSchema = z
  .object({
    // Hỗ trợ 1 tài liệu (cũ) hoặc nhiều tài liệu.
    documentId: z.string().min(1).optional(),
    documentIds: z.array(z.string().min(1)).min(1).max(10).optional(),
    // Nếu có: chỉ sinh từ phần MỚI/ĐÃ SỬA so với tài liệu này (bản cũ).
    comparedToDocumentId: z.string().min(1).optional(),
    config: generationConfigSchema.optional(),
  })
  .refine(
    (d) => !!d.documentId || (d.documentIds?.length ?? 0) > 0,
    { message: "Thiếu tài liệu nguồn" }
  );

export const draftQuestionSchema = z.object({
  text: z.string().min(1, "Câu hỏi không được trống"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("MEDIUM"),
  timeLimit: z.number().min(5).max(120).default(20),
  points: z.number().min(10).max(1000).default(100),
  sourceQuote: z.string().optional().default(""),
  chunkId: z.string().optional().default(""),
  grounded: z.boolean().optional().default(true),
  answers: z
    .array(
      z.object({
        text: z.string().min(1, "Đáp án không được trống"),
        isCorrect: z.boolean().default(false),
      })
    )
    .min(2, "Tối thiểu 2 đáp án")
    .max(4, "Tối đa 4 đáp án")
    .refine((a) => a.filter((x) => x.isCorrect).length === 1, {
      message: "Mỗi câu phải có đúng 1 đáp án đúng",
    }),
});

export const updateDraftSchema = z.object({
  questions: z.array(draftQuestionSchema).min(1, "Tối thiểu 1 câu hỏi"),
});

export const publishGenerationSchema = z.object({
  title: z.string().min(1, "Tiêu đề không được trống").max(200),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().default(true),
  folderId: z.string().optional().nullable(),
});

// ── Phiên bản hóa quy định ───────────────────────────────────

export const updateDocumentSchema = z.object({
  regulationCode: z.string().max(200).optional().nullable(),
  effectiveDate: z.string().datetime().optional().nullable(),
});

export const supersedeDocumentSchema = z.object({
  // Tài liệu MỚI thay thế tài liệu hiện tại.
  supersededById: z.string().min(1, "Thiếu tài liệu thay thế"),
});

// ── Agent giải thích đáp án ──────────────────────────────────

export const createExplanationSchema = z.object({
  questionSetId: z.string().min(1, "Thiếu questionSetId"),
});

// Lưu nội dung giải thích đã chỉnh trong màn review.
export const updateExplanationsSchema = z.object({
  explanations: z
    .array(
      z.object({
        questionId: z.string().min(1),
        body: z.string().min(1, "Giải thích không được trống"),
      })
    )
    .min(1, "Không có nội dung để cập nhật"),
});

export const createGameSchema = z.object({
  questionSetId: z.string().min(1),
  gameMode: z.enum(["CLASSIC", "RACE", "BATTLE_ROYALE", "CHALLENGE"]),
  isHomework: z.boolean().default(false),
  deadline: z.string().datetime().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type QuestionSetInput = z.infer<typeof questionSetSchema>;
export type FolderInput = z.infer<typeof folderSchema>;
export type CreateGameInput = z.infer<typeof createGameSchema>;
export type GenerationConfig = z.infer<typeof generationConfigSchema>;
export type CreateGenerationInput = z.infer<typeof createGenerationSchema>;
export type DraftQuestionInput = z.infer<typeof draftQuestionSchema>;
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>;
export type PublishGenerationInput = z.infer<typeof publishGenerationSchema>;
export type CreateExplanationInput = z.infer<typeof createExplanationSchema>;
export type UpdateExplanationsInput = z.infer<typeof updateExplanationsSchema>;
export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;
export type SupersedeDocumentInput = z.infer<typeof supersedeDocumentSchema>;
