export interface PlayerAnswerRecord {
  questionId: string;
  answerId: string;
  isCorrect: boolean;
  timeTaken: number;
  points: number;
}

export interface GamePlayer {
  socketId: string;
  nickname: string;
  avatarId: string;
  score: number;
  streak: number;
  isEliminated: boolean;
  answers: PlayerAnswerRecord[];
}


export interface QuestionExplanationData {
  body: string;
  citations: { quote: string }[];
}

export interface GameQuestion {
  id: string;
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  points: number;
  answers: { id: string; text: string; isCorrect: boolean }[];
  /** Giải thích đã duyệt (CURRENT) để hiện sau khi lộ đáp án; null nếu chưa có. */
  explanation: QuestionExplanationData | null;
}

export interface GameState {
  code: string;
  hostSocketId: string | null;
  questionSetId: string;
  gameSessionId: string | null;
  status: "waiting" | "playing" | "finished";
  players: Map<string, GamePlayer>;
  questions: GameQuestion[];
  currentQuestionIndex: number;
  questionStartTime: number | null;
  answeredPlayers: Set<string>;
  questionTimer: ReturnType<typeof setTimeout> | null;
}

class GameManager {
  private games = new Map<string, GameState>();

  createGame(code: string, questionSetId: string, gameSessionId?: string): GameState {
    const game: GameState = {
      code,
      hostSocketId: null,
      questionSetId,
      gameSessionId: gameSessionId ?? null,
      status: "waiting",
      players: new Map(),
      questions: [],
      currentQuestionIndex: -1,
      questionStartTime: null,
      answeredPlayers: new Set(),
      questionTimer: null,
    };
    this.games.set(code, game);
    return game;
  }

  getGame(code: string): GameState | undefined {
    return this.games.get(code);
  }

  removeGame(code: string) {
    const game = this.games.get(code);
    if (game?.questionTimer) clearTimeout(game.questionTimer);
    this.games.delete(code);
  }

  addPlayer(code: string, socketId: string, nickname: string, avatarId = "cat"): GamePlayer | null {
    const game = this.games.get(code);
    if (!game || game.status !== "waiting") return null;

    const exists = Array.from(game.players.values()).some(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
    );
    if (exists) return null;

    const player: GamePlayer = {
      socketId,
      nickname,
      avatarId,
      score: 0,
      streak: 0,
      isEliminated: false,
      answers: [],
    };
    game.players.set(socketId, player);
    return player;
  }

  removePlayer(code: string, socketId: string) {
    const game = this.games.get(code);
    if (!game) return;
    game.players.delete(socketId);
  }

  getPlayerList(code: string): GamePlayer[] {
    const game = this.games.get(code);
    if (!game) return [];
    return Array.from(game.players.values());
  }

  startGame(code: string, questions: GameQuestion[]): boolean {
    const game = this.games.get(code);
    if (!game || game.status !== "waiting" || questions.length === 0) return false;
    game.status = "playing";
    game.questions = questions;
    game.currentQuestionIndex = -1;
    return true;
  }

  nextQuestion(code: string): GameQuestion | null {
    const game = this.games.get(code);
    if (!game || game.status !== "playing") return null;

    game.currentQuestionIndex++;
    if (game.currentQuestionIndex >= game.questions.length) {
      game.status = "finished";
      return null;
    }

    game.questionStartTime = Date.now();
    game.answeredPlayers = new Set();
    return game.questions[game.currentQuestionIndex];
  }

  submitAnswer(
    code: string,
    socketId: string,
    answerId: string
  ): { correct: boolean; points: number; timeTaken: number } | null {
    const game = this.games.get(code);
    if (!game || game.status !== "playing" || !game.questionStartTime) return null;

    const player = game.players.get(socketId);
    if (!player || game.answeredPlayers.has(socketId)) return null;

    game.answeredPlayers.add(socketId);
    const question = game.questions[game.currentQuestionIndex];
    const timeTaken = (Date.now() - game.questionStartTime) / 1000;

    if (timeTaken > question.timeLimit) return null;

    const answer = question.answers.find((a) => a.id === answerId);
    const correct = answer?.isCorrect ?? false;

    let points = 0;
    if (correct) {
      const timeBonus = Math.max(0, 1 - timeTaken / question.timeLimit);
      points = Math.round(question.points * (0.5 + 0.5 * timeBonus));
      player.score += points;
      player.streak++;
    } else {
      player.streak = 0;
    }

    player.answers.push({
      questionId: question.id,
      answerId,
      isCorrect: correct,
      timeTaken,
      points,
    });

    return { correct, points, timeTaken };
  }

  allAnswered(code: string): boolean {
    const game = this.games.get(code);
    if (!game) return false;
    const activePlayers = Array.from(game.players.values()).filter(
      (p) => !p.isEliminated
    );
    return game.answeredPlayers.size >= activePlayers.length;
  }

  getLeaderboard(code: string): { nickname: string; score: number; avatarId: string }[] {
    const game = this.games.get(code);
    if (!game) return [];
    return Array.from(game.players.values())
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ nickname: p.nickname, score: p.score, avatarId: p.avatarId }));
  }

  getQuestionResults(code: string) {
    const game = this.games.get(code);
    if (!game) return null;
    const question = game.questions[game.currentQuestionIndex];
    if (!question) return null;

    return {
      correctAnswerId: question.answers.find((a) => a.isCorrect)?.id,
      totalPlayers: game.players.size,
      answeredCount: game.answeredPlayers.size,
      explanation: question.explanation ?? null,
    };
  }
}

export const gameManager = new GameManager();
