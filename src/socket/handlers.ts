import type { Server, Socket } from "socket.io";
import { gameManager } from "./game-manager";

export function setupSocketHandlers(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    // ── HOST: join/create room ──────────────────────────────────────────
    socket.on("host:create-room", ({ code }: { code: string }) => {
      let game = gameManager.getGame(code);
      if (!game) {
        game = gameManager.createGame(code, "");
      }
      game.hostSocketId = socket.id;
      socket.join(`game:${code}`);
      socket.data.gameCode = code;
      socket.data.isHost = true;

      socket.emit("host:room-created", {
        code,
        players: gameManager.getPlayerList(code).map((p) => ({
          nickname: p.nickname,
          score: p.score,
          avatarId: p.avatarId,
        })),
      });
    });

    // ── HOST: start game (fetch questions from DB) ──────────────────────
    socket.on("host:start-game", async ({ code }: { code: string }) => {
      const game = gameManager.getGame(code);
      if (!game || game.hostSocketId !== socket.id) return;

      if (game.players.size === 0) {
        socket.emit("game:error", "Cần ít nhất 1 người chơi");
        return;
      }

      try {
        const { prisma } = await import("@/lib/prisma");
        const session = await prisma.gameSession.findUnique({
          where: { gameCode: code },
          include: {
            questionSet: {
              include: {
                questions: {
                  include: { answers: { orderBy: { order: "asc" } } },
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        });

        if (!session) {
          socket.emit("game:error", "Game session không tồn tại");
          return;
        }

        game.gameSessionId = session.id;
        game.questionSetId = session.questionSetId;

        const questions = session.questionSet.questions.map((q) => ({
          id: q.id,
          text: q.text,
          imageUrl: q.imageUrl,
          timeLimit: q.timeLimit,
          points: q.points,
          answers: q.answers.map((a) => ({
            id: a.id,
            text: a.text,
            isCorrect: a.isCorrect,
          })),
        }));

        const started = gameManager.startGame(code, questions);
        if (!started) return;

        await prisma.gameSession.update({
          where: { id: session.id },
          data: { status: "IN_PROGRESS", startedAt: new Date() },
        });

        io.to(`game:${code}`).emit("game:started");
        sendNextQuestion(io, code);
      } catch (err) {
        console.error("[Socket] host:start-game error:", err);
        socket.emit("game:error", "Lỗi khi bắt đầu game");
      }
    });

    // ── HOST: next question ─────────────────────────────────────────────
    socket.on("host:next-question", ({ code }: { code: string }) => {
      const game = gameManager.getGame(code);
      if (!game || game.hostSocketId !== socket.id) return;
      sendNextQuestion(io, code);
    });

    // ── PLAYER: join ────────────────────────────────────────────────────
    socket.on(
      "player:join",
      ({ code, nickname, avatarId }: { code: string; nickname: string; avatarId?: string }) => {
        const player = gameManager.addPlayer(code, socket.id, nickname, avatarId);
        if (!player) {
          socket.emit(
            "game:error",
            "Không thể tham gia (tên đã tồn tại hoặc game đã bắt đầu)"
          );
          return;
        }

        socket.join(`game:${code}`);
        socket.data.gameCode = code;
        socket.data.isHost = false;

        socket.emit("player:joined", { nickname: player.nickname, avatarId: player.avatarId });
        io.to(`game:${code}`).emit("game:player-joined", {
          players: gameManager.getPlayerList(code).map((p) => ({
            nickname: p.nickname,
            score: p.score,
            avatarId: p.avatarId,
          })),
        });
      }
    );

    // ── PLAYER: answer ──────────────────────────────────────────────────
    socket.on(
      "player:answer",
      ({ code, answerId }: { code: string; answerId: string }) => {
        const result = gameManager.submitAnswer(code, socket.id, answerId);
        if (!result) return;

        socket.emit("game:answer-result", result);

        const game = gameManager.getGame(code);
        if (game?.hostSocketId) {
          io.to(game.hostSocketId).emit("game:player-answered", {
            answeredCount: game.answeredPlayers.size,
            totalPlayers: game.players.size,
          });
        }

        if (gameManager.allAnswered(code)) {
          endQuestion(io, code);
        }
      }
    );

    // ── DISCONNECT ──────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      const code = socket.data.gameCode;
      if (!code) return;

      const game = gameManager.getGame(code);
      if (!game) return;

      if (game.hostSocketId === socket.id) {
        io.to(`game:${code}`).emit("game:host-left");
        saveAndCleanup(code).catch(console.error);
      } else {
        gameManager.removePlayer(code, socket.id);
        io.to(`game:${code}`).emit("game:player-joined", {
          players: gameManager.getPlayerList(code).map((p) => ({
            nickname: p.nickname,
            score: p.score,
            avatarId: p.avatarId,
          })),
        });
      }
    });
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function sendNextQuestion(io: Server, code: string) {
  const question = gameManager.nextQuestion(code);

  if (!question) {
    // No more questions → game over
    const leaderboard = gameManager.getLeaderboard(code);
    io.to(`game:${code}`).emit("game:ended", { leaderboard });
    saveAndCleanup(code).catch(console.error);
    return;
  }

  const game = gameManager.getGame(code);
  const safeQuestion = {
    index: game!.currentQuestionIndex,
    total: game!.questions.length,
    text: question.text,
    imageUrl: question.imageUrl,
    timeLimit: question.timeLimit,
    answers: question.answers.map((a) => ({ id: a.id, text: a.text })),
  };

  io.to(`game:${code}`).emit("game:question", safeQuestion);

  if (game?.questionTimer) clearTimeout(game.questionTimer);
  game!.questionTimer = setTimeout(() => {
    endQuestion(io, code);
  }, question.timeLimit * 1000 + 1000);
}

function endQuestion(io: Server, code: string) {
  const game = gameManager.getGame(code);
  if (!game) return;
  if (game.questionTimer) {
    clearTimeout(game.questionTimer);
    game.questionTimer = null;
  }

  const results = gameManager.getQuestionResults(code);
  const leaderboard = gameManager.getLeaderboard(code);

  io.to(`game:${code}`).emit("game:question-ended", {
    ...results,
    leaderboard: leaderboard.slice(0, 5),
  });
}

async function saveAndCleanup(code: string) {
  const game = gameManager.getGame(code);
  if (!game || !game.gameSessionId) {
    gameManager.removeGame(code);
    return;
  }

  const sessionId = game.gameSessionId;
  const players = gameManager.getPlayerList(code);

  try {
    const { prisma } = await import("@/lib/prisma");

    await prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: "FINISHED", endedAt: new Date() },
    });

    for (const player of players) {
      const dbPlayer = await prisma.gamePlayer.create({
        data: {
          nickname: player.nickname,
          score: player.score,
          isEliminated: player.isEliminated,
          gameSessionId: sessionId,
        },
      });

      if (player.answers.length > 0) {
        await prisma.playerAnswer.createMany({
          data: player.answers.map((a) => ({
            questionId: a.questionId,
            selectedAnswer: a.answerId,
            isCorrect: a.isCorrect,
            timeTaken: a.timeTaken,
            playerId: dbPlayer.id,
          })),
        });
      }
    }

    // Increment playCount on the question set
    await prisma.questionSet.update({
      where: { id: game.questionSetId },
      data: { playCount: { increment: 1 } },
    });
  } catch (err) {
    console.error("[Socket] saveAndCleanup error:", err);
  } finally {
    gameManager.removeGame(code);
  }
}
