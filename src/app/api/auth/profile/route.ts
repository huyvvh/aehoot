import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { z } from "zod";

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  avatarUrl: z.string().url().optional().nullable(),
});

export async function PATCH(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) {
    return apiError("Chưa đăng nhập", "UNAUTHORIZED", 401);
  }

  try {
    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: parsed.data,
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true },
    });

    return apiResponse({ user });
  } catch {
    return apiError("Đã xảy ra lỗi", "INTERNAL_ERROR", 500);
  }
}
