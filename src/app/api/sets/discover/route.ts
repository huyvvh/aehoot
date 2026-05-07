import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 12;
  const skip = (page - 1) * limit;

  const where = {
    isPublic: true,
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" as const } },
            { description: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [sets, total] = await Promise.all([
    prisma.questionSet.findMany({
      where,
      include: {
        _count: { select: { questions: true } },
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        ...(user
          ? {
              favorites: {
                where: { userId: user.userId },
                select: { id: true },
              },
            }
          : {}),
      },
      orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.questionSet.count({ where }),
  ]);

  const data = sets.map((s) => ({
    ...s,
    isFavorited: user ? (s as any).favorites?.length > 0 : false,
    favorites: undefined,
  }));

  return apiResponse({ sets: data, total, page, pages: Math.ceil(total / limit) });
}
