"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/use-socket";
import { Users, Play, Trophy, Clock, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

interface Player {
  nickname: string;
  score: number;
}

interface QuestionData {
  index: number;
  total: number;
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  answers: { id: string; text: string }[];
}

interface QuestionEndData {
  correctAnswerId: string;
  leaderboard: { nickname: string; score: number }[];
  answeredCount: number;
  totalPlayers: number;
}

type GamePhase = "lobby" | "playing" | "question-results" | "finished";

const ANSWER_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444"];

export default function HostGamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { socket, connected } = useSocket();
  const [phase, setPhase] = useState<GamePhase>("lobby");
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [results, setResults] = useState<QuestionEndData | null>(null);
  const [leaderboard, setLeaderboard] = useState<Player[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit("host:create-room", { code });
    socket.data = { gameCode: code };

    socket.on("host:room-created", (data: { players: Player[] }) => {
      setPlayers(data.players);
    });

    socket.on("game:player-joined", (data: { players: Player[] }) => {
      setPlayers(data.players);
    });

    socket.on("game:question", (data: QuestionData) => {
      setQuestion(data);
      setPhase("playing");
      setTimeLeft(data.timeLimit);
      setAnsweredCount(0);
      setResults(null);
    });

    socket.on(
      "game:player-answered",
      (data: { answeredCount: number }) => {
        setAnsweredCount(data.answeredCount);
      }
    );

    socket.on("game:question-ended", (data: QuestionEndData) => {
      setResults(data);
      setPhase("question-results");
    });

    socket.on("game:ended", (data: { leaderboard: Player[] }) => {
      setLeaderboard(data.leaderboard);
      setPhase("finished");
    });

    return () => {
      socket.off("host:room-created");
      socket.off("game:player-joined");
      socket.off("game:question");
      socket.off("game:player-answered");
      socket.off("game:question-ended");
      socket.off("game:ended");
    };
  }, [socket, connected, code]);

  useEffect(() => {
    if (phase !== "playing" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const startGame = useCallback(() => {
    if (!socket) return;
    socket.emit("host:start-game", { code });
  }, [socket, code]);

  const nextQuestion = useCallback(() => {
    if (!socket) return;
    socket.emit("host:next-question", { code });
  }, [socket, code]);

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/play/${code}`
      : "";

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success("Đã copy Game PIN!");
  };

  // Warn before accidental navigation away during game
  useEffect(() => {
    if (phase === "finished") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // LOBBY
  if (phase === "lobby") {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-white rounded-3xl p-8 shadow-lg mb-6">
          <p className="text-gray-500 font-bold mb-2">Game PIN</p>
          <h1 className="text-7xl font-black text-[#3a3a5c] tracking-[0.2em] mb-4">
            {code}
          </h1>
          <div className="flex justify-center mb-4">
            <QRCodeSVG value={joinUrl} size={150} />
          </div>
          <button
            onClick={copyCode}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm rounded-lg transition-colors"
          >
            <Copy className="h-4 w-4" />
            Copy PIN
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Hoặc truy cập <span className="font-bold text-[#7c5cbf] break-all">{joinUrl}</span>
          </p>
        </div>

        <div className="bg-white/80 rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Users className="h-5 w-5 text-[#7c5cbf]" />
            <span className="font-black text-[#3a3a5c] text-lg">
              {players.length} Players
            </span>
          </div>
          {players.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-3">
              {players.map((p) => (
                <span
                  key={p.nickname}
                  className="px-4 py-2 bg-[#7c5cbf] text-white font-bold rounded-xl shadow-[0_3px_0_#5e3d9e]"
                >
                  {p.nickname}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 font-medium">
              Đang chờ người chơi tham gia...
            </p>
          )}
        </div>

        <button
          onClick={startGame}
          disabled={players.length === 0}
          className="px-10 py-4 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-gray-300 text-white font-black text-2xl rounded-xl transition-colors shadow-[0_5px_0_#38a89d] disabled:shadow-[0_5px_0_#aaa]"
        >
          <Play className="inline h-7 w-7 fill-white mr-2" />
          Start Game!
        </button>
      </div>
    );
  }

  // PLAYING - show question
  if (phase === "playing" && question) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/80 font-bold text-lg">
            Question {question.index + 1}/{question.total}
          </span>
          <div className="flex items-center gap-2 bg-white/20 backdrop-blur rounded-xl px-4 py-2">
            <Clock className="h-5 w-5 text-white" />
            <span className="text-white font-black text-2xl">{timeLeft}</span>
          </div>
          <span className="text-white/80 font-bold">
            {answeredCount}/{players.length} answered
          </span>
        </div>

        <div className="bg-white rounded-2xl p-8 text-center mb-6 shadow-lg">
          <h2 className="text-3xl font-black text-[#3a3a5c]">
            {question.text}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {question.answers.map((a, i) => (
            <div
              key={a.id}
              className="rounded-xl p-6 text-center"
              style={{
                backgroundColor: ANSWER_COLORS[i],
                boxShadow: `0 4px 0 rgba(0,0,0,0.2)`,
              }}
            >
              <span className="text-white font-black text-xl">{a.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // QUESTION RESULTS
  if (phase === "question-results" && results) {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-black text-[#3a3a5c] mb-6">
          Results
        </h2>
        <p className="text-lg text-gray-500 font-bold mb-8">
          {results.answeredCount}/{results.totalPlayers} players answered
        </p>

        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <h3 className="font-black text-[#3a3a5c] text-xl mb-4">
            Leaderboard
          </h3>
          <div className="space-y-3">
            {results.leaderboard.map((p, i) => (
              <div
                key={p.nickname}
                className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-white ${
                      i === 0
                        ? "bg-[#f59e0b]"
                        : i === 1
                          ? "bg-gray-400"
                          : i === 2
                            ? "bg-[#cd7f32]"
                            : "bg-gray-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-bold text-[#3a3a5c]">
                    {p.nickname}
                  </span>
                </div>
                <span className="font-black text-[#7c5cbf]">
                  {p.score} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={nextQuestion}
          className="px-8 py-3 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-black text-xl rounded-xl transition-colors shadow-[0_4px_0_#38a89d]"
        >
          Next Question
        </button>
      </div>
    );
  }

  // FINISHED
  if (phase === "finished") {
    return (
      <div className="max-w-4xl mx-auto text-center">
        <Trophy className="h-20 w-20 text-[#f59e0b] mx-auto mb-4" />
        <h1 className="text-4xl font-black text-[#3a3a5c] mb-8">
          Game Over!
        </h1>

        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
          <div className="space-y-3">
            {leaderboard.map((p, i) => (
              <div
                key={p.nickname}
                className={`flex items-center justify-between rounded-xl px-5 py-4 ${
                  i === 0
                    ? "bg-[#f59e0b]/10 border-2 border-[#f59e0b]"
                    : "bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-lg ${
                      i === 0
                        ? "bg-[#f59e0b]"
                        : i === 1
                          ? "bg-gray-400"
                          : i === 2
                            ? "bg-[#cd7f32]"
                            : "bg-gray-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-black text-[#3a3a5c] text-lg">
                    {p.nickname}
                  </span>
                </div>
                <span className="font-black text-[#7c5cbf] text-xl">
                  {p.score} pts
                </span>
              </div>
            ))}
          </div>
        </div>

        <a
          href="/dashboard"
          className="inline-flex px-8 py-3 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-black text-xl rounded-xl transition-colors shadow-[0_4px_0_#5e3d9e]"
        >
          Back to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-[#7c5cbf] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
