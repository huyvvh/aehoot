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

export const createGenerationSchema = z.object({
  documentId: z.string().min(1, "Thiếu documentId"),
  config: generationConfigSchema.optional(),
});

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
