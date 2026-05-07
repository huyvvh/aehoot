import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, hashPassword, verifyPassword, apiResponse, apiError } from "@/lib/auth";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Mật khẩu mới tối thiểu 8 ký tự"),
});

export async function POST(req: NextRequest) {
  const payload = getUserFromRequest(req);
  if (!payload) {
    return apiError("Chưa đăng nhập", "UNAUTHORIZED", 401);
  }

  try {
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { passwordHash: true },
    });

    if (!user) {
      return apiError("User không tồn tại", "NOT_FOUND", 404);
    }

    const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
      return apiError("Mật khẩu hiện tại không đúng", "INVALID_PASSWORD", 400);
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash: newHash },
    });

    return apiResponse({ message: "Đổi mật khẩu thành công" });
  } catch {
    return apiError("Đã xảy ra lỗi", "INTERNAL_ERROR", 500);
  }
}
