import OpenAI from "openai";

/**
 * GLM 5.2 (Z.ai) client — OpenAI-compatible.
 * Docs: https://docs.z.ai/guides/llm/glm-5.2
 * Base URL: https://api.z.ai/api/paas/v4  ·  endpoint: POST /chat/completions
 */

const apiKey = process.env.ZAI_API_KEY;
const baseURL = process.env.ZAI_BASE_URL ?? "https://api.z.ai/api/paas/v4";

if (!apiKey) {
  // Surface misconfig early rather than failing deep inside a generation job.
  console.warn("[ai] ZAI_API_KEY is not set — question generation will fail.");
}

export const llm = new OpenAI({ apiKey, baseURL });

export const GLM_MODEL = process.env.ZAI_MODEL ?? "glm-5.2";
