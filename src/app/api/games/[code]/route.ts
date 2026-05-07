import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserFromRequest, apiResponse, apiError } from "@/lib/auth";
import { gameManager } from "@/socket/game-manager";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const user = getUserFromRequest(req);

  // Active game (in-memory) — public check for player join validation
  const liveGame = gameManager.getGame(code);
  if (liveGame) {
    return apiResponse({
      code: liveGame.code,
      status: liveGame.status,
      playerCount: liveGame.players.size,
    });
  }

  // Finished game from DB — requires auth (host only)
  if (!user) return apiError("Game không tồn tại hoặc đã kết thúc", "NOT_FOUND", 404);

  const session = await prisma.gameSession.findFirst({
    where: { gameCode: code, hostId: user.userId },
    include: {
      questionSet: { select: { id: true, title: true, coverImage: true } },
      players: {
        include: {
          answers: {
            include: { question: { select: { text: true } } },
          },
        },
        orderBy: { score: "desc" },
      },
    },
  });

  if (!session) return apiError("Game không tồn tại", "NOT_FOUND", 404);

  const totalPlayers = session.players.length;
  const avgScore =
    totalPlayers > 0
      ? Math.round(
          session.players.reduce((s, p) => s + p.score, 0) / totalPlayers
        )
      : 0;

  return apiResponse({
    ...session,
    summary: { totalPlayers, avgScore },
  });
}
