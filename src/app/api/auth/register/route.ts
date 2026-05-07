import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, apiResponse, apiError } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return apiError(parsed.error.issues[0].message, "VALIDATION_ERROR");
    }

    const { email, username, password, displayName } = parsed.data;

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      return apiError(`${field} đã được sử dụng`, "DUPLICATE", 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { email, username, passwordHash, displayName },
      select: { id: true, email: true, username: true, displayName: true, avatarUrl: true },
    });

    const token = signToken({ userId: user.id, email: user.email });

    const response = apiResponse({ user, token });
    response.headers.set(
      "Set-Cookie",
      `token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}`
    );

    return response;
  } catch {
    return apiError("Đã xảy ra lỗi", "INTERNAL_ERROR", 500);
  }
}
