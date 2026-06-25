import { NextRequest } from "next/server";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { regenerateStale } from "@/lib/ai/maintenance";

/**
 * Bảo trì thủ công: người dùng tự cập nhật các giải thích STALE của mình ngay,
 * không cần đợi cron. Sinh lại → đưa về hàng chờ duyệt (REVIEW).
 */
export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const result = await regenerateStale({ userId: user.userId });
  return apiResponse(result);
}
