import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) {
    return apiError("Chưa đăng nhập", "UNAUTHORIZED", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, createdAt: true },
  });

  if (!user) {
    return apiError("User không tồn tại", "NOT_FOUND", 404);
  }

  return apiResponse({ user });
}
