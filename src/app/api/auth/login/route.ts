import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, apiResponse, apiError } from "@/lib/auth";
import { loginSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true, passwordHash: true },
    });

    if (!user) {
      return apiError("Email hoặc mật khẩu không đúng", "INVALID_CREDENTIALS", 401);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return apiError("Email hoặc mật khẩu không đúng", "INVALID_CREDENTIALS", 401);
    }

    const token = signToken({ userId: user.id, email: user.email });

    const { passwordHash: _, ...userWithoutPassword } = user;
    void _;

    const response = apiResponse({ user: userWithoutPassword, token });
    response.headers.set(
      "Set-Cookie",
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    return response;
  } catch {
    return apiError("Đã xảy ra lỗi", "INTERNAL_ERROR", 500);
  }
}
