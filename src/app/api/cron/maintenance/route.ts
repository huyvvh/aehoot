import { NextRequest } from "next/server";
import { apiResponse, apiError } from "@/lib/auth";
import { regenerateStale } from "@/lib/ai/maintenance";

/**
 * Cron bảo trì hệ thống: quét toàn bộ giải thích STALE → sinh lại theo tài liệu
 * hiện hành → hàng chờ duyệt. Gọi định kỳ bởi scheduler ngoài với header
 * `x-cron-secret`. KHÔNG dùng auth người dùng.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return apiError("CRON_SECRET chưa cấu hình", "CRON_NOT_CONFIGURED", 503);
  }
  if (req.headers.get("x-cron-secret") !== secret) {
    return apiError("Forbidden", "FORBIDDEN", 403);
  }

  const result = await regenerateStale({});
  console.log("[cron/maintenance]", result);
  return apiResponse(result);
}
