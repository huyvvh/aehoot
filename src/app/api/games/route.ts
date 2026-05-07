import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";

function generateGameCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function GET(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = 10;

  const games = await prisma.gameSession.findMany({
    where: {
      hostId: user.userId,
      ...(status ? { status: status as any } : {}),
    },
    include: {
      questionSet: { select: { id: true, title: true, coverImage: true } },
      _count: { select: { players: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });

  const total = await prisma.gameSession.count({
    where: { hostId: user.userId, ...(status ? { status: status as any } : {}) },
  });

  return apiResponse({ games, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const user = getUserFromRequest(req);
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const body = await req.json();
  const { questionSetId, gameMode = "CLASSIC" } = body;

  const set = await prisma.questionSet.findFirst({
    where: {
      id: questionSetId,
      OR: [{ authorId: user.userId }, { isPublic: true }],
    },
    include: {
      questions: {
        include: { answers: { orderBy: { order: "asc" } } },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!set) return apiError("Set không tồn tại", "NOT_FOUND", 404);
  if (set.questions.length === 0)
    return apiError("Set cần ít nhất 1 câu hỏi", "NO_QUESTIONS");

  let code = generateGameCode();
  let existing = await prisma.gameSession.findUnique({ where: { gameCode: code } });
  while (existing) {
    code = generateGameCode();
    existing = await prisma.gameSession.findUnique({ where: { gameCode: code } });
  }

  const session = await prisma.gameSession.create({
    data: {
      gameCode: code,
      gameMode: gameMode as any,
      hostId: user.userId,
      questionSetId,
    },
  });

  return apiResponse({ code: session.gameCode, gameMode: session.gameMode }, 201);
}
