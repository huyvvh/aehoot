import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const favorites = await prisma.favorite.findMany({
    where: { userId: user.userId },
    include: {
      questionSet: {
        include: {
          _count: { select: { questions: true } },
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      },
    },
    orderBy: { id: "desc" },
  });

  const sets = favorites.map((f) => ({ ...f.questionSet, isFavorited: true }));
  return apiResponse(sets);
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { questionSetId } = await req.json();
  if (!questionSetId) return apiError("questionSetId is required", "VALIDATION_ERROR");

  const set = await prisma.questionSet.findFirst({
    where: { id: questionSetId, isPublic: true },
  });
  if (!set) return apiError("Set không tồn tại hoặc không công khai", "NOT_FOUND", 404);

  const existing = await prisma.favorite.findUnique({
    where: { userId_questionSetId: { userId: user.userId, questionSetId } },
  });

  if (existing) {
    await prisma.favorite.delete({ where: { id: existing.id } });
    return apiResponse({ favorited: false });
  }

  await prisma.favorite.create({ data: { userId: user.userId, questionSetId } });
  return apiResponse({ favorited: true });
}
