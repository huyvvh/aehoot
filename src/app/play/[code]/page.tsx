"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/use-socket";
import { Trophy, Clock, Check, X, LogOut } from "lucide-react";
import { toast } from "sonner";

interface QuestionData {
  index: number;
  total: number;
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  answers: { id: string; text: string }[];
}

interface AnswerResult {
  correct: boolean;
  points: number;
  timeTaken: number;
}

type PlayerPhase =
  | "join"
  | "waiting"
  | "question"
  | "answered"
  | "result"
  | "finished";

const ANSWER_COLORS = [
  { bg: "#f59e0b", shadow: "#d97706", label: "▲" },
  { bg: "#3b82f6", shadow: "#2563eb", label: "◆" },
  { bg: "#10b981", shadow: "#059669", label: "●" },
  { bg: "#ef4444", shadow: "#dc2626", label: "■" },
];

const BG_PURPLE = "linear-gradient(135deg, #8b5dc8, #a855f7)";

export default function PlayerGamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { socket, connected } = useSocket();
  const [phase, setPhase] = useState<PlayerPhase>("join");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<
    { nickname: string; score: number }[]
  >([]);
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);

  // Warn on accidental navigation away during game
  useEffect(() => {
    if (phase === "join" || phase === "finished") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.on("player:joined", () => {
      setPhase("waiting");
      setError("");
      setJoining(false);
    });

    socket.on("game:error", (msg: string) => {
      setError(msg);
      setJoining(false);
      toast.error(msg);
    });

    socket.on("game:started", () => {
      setPhase("waiting");
    });

    socket.on("game:question", (data: QuestionData) => {
      setQuestion(data);
      setPhase("question");
      setTimeLeft(data.timeLimit);
      setSelectedAnswer(null);
      setAnswerResult(null);
      setCorrectAnswerId(null);
    });

    socket.on("game:answer-result", (result: AnswerResult) => {
      setAnswerResult(result);
      setTotalScore((s) => s + result.points);
      setPhase("answered");
    });

    socket.on("game:question-ended", (data: { correctAnswerId: string }) => {
      setCorrectAnswerId(data.correctAnswerId);
      setPhase("result");
    });

    socket.on(
      "game:ended",
      (data: { leaderboard: { nickname: string; score: number }[] }) => {
        setLeaderboard(data.leaderboard);
        setPhase("finished");
      }
    );

    socket.on("game:host-left", () => {
      setPhase("join");
      setError("");
      toast.error("Host đã rời game");
    });

    return () => {
      socket.off("player:joined");
      socket.off("game:error");
      socket.off("game:started");
      socket.off("game:question");
      socket.off("game:answer-result");
      socket.off("game:question-ended");
      socket.off("game:ended");
      socket.off("game:host-left");
    };
  }, [socket, connected]);

  useEffect(() => {
    if (phase !== "question" || timeLeft <= 0) return;
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

  const handleJoin = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = nickname.trim();
      if (!socket || !name || !connected) return;
      setJoining(true);
      setError("");
      socket.data = { gameCode: code };
      socket.emit("player:join", { code, nickname: name });
    },
    [socket, code, nickname, connected]
  );

  const handleAnswer = useCallback(
    (answerId: string) => {
      if (!socket || selectedAnswer) return;
      setSelectedAnswer(answerId);
      socket.emit("player:answer", { code, answerId });
    },
    [socket, code, selectedAnswer]
  );

  // Timer color
  const timerColor =
    timeLeft > 10 ? "#4ecdc4" : timeLeft > 5 ? "#f59e0b" : "#ef4444";
  const timerPct = question ? (timeLeft / question.timeLimit) * 100 : 100;

  // JOIN SCREEN
  if (phase === "join") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        style={{ background: BG_PURPLE }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M18 0h4v18h18v4H22v18h-4V22H0v-4h18V0z' fill='%23ffffff'/%3E%3C/svg%3E")`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 w-full max-w-sm">
          <h1 className="text-5xl font-black italic text-white mb-1 drop-shadow-lg text-center">
            AEHoot
          </h1>
          <p className="text-white/50 font-bold text-center mb-8">
            Game: <span className="text-white font-black tracking-widest">{code}</span>
          </p>

          <form onSubmit={handleJoin} className="space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                setError("");
              }}
              placeholder="Nhập tên của bạn"
              maxLength={20}
              className="w-full h-14 px-5 text-center text-xl font-bold rounded-xl bg-white text-[#3a3a5c] outline-none shadow-lg focus:ring-2 focus:ring-white/50"
              autoFocus
            />
            {error && (
              <p className="text-red-300 text-center font-bold text-sm bg-red-900/20 rounded-lg py-2 px-3">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={!nickname.trim() || !connected || joining}
              className="w-full h-14 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-gray-400 disabled:shadow-none text-white font-black text-xl rounded-xl transition-all shadow-[0_5px_0_#38a89d] active:shadow-[0_2px_0_#38a89d] active:translate-y-[3px]"
            >
              {joining ? "Đang kết nối..." : "Join!"}
            </button>
          </form>

          {!connected && (
            <p className="text-white/50 text-center text-sm font-medium mt-4">
              Đang kết nối server...
            </p>
          )}
        </div>
      </div>
    );
  }

  // WAITING
  if (phase === "waiting") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4"
        style={{ background: BG_PURPLE }}
      >
        <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mb-6" />
        <h2 className="text-2xl font-black text-white mb-2">You&apos;re in!</h2>
        <p className="text-white/60 font-bold text-center">
          Đang chờ host bắt đầu game...
        </p>
        <p className="text-white/40 font-bold mt-2 text-sm">{nickname}</p>
      </div>
    );
  }

  // QUESTION
  if (phase === "question" && question) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: BG_PURPLE }}
      >
        {/* Timer bar */}
        <div className="h-2 bg-white/20 w-full">
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
          />
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-white/60 font-bold text-sm">
            {question.index + 1}/{question.total}
          </span>
          <div
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 font-black text-lg transition-colors"
            style={{ backgroundColor: timerColor + "33", color: "white" }}
          >
            <Clock className="h-4 w-4" />
            {timeLeft}s
          </div>
          <span className="text-white font-bold text-sm">{totalScore} pts</span>
        </div>

        <div className="px-4">
          {question.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.imageUrl}
              alt=""
              className="w-full max-h-40 object-cover rounded-2xl mb-3"
            />
          )}
          <div className="bg-white rounded-2xl p-5 text-center shadow-lg mb-4">
            <h2 className="text-lg sm:text-xl font-black text-[#3a3a5c] leading-snug">
              {question.text}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-4 pb-6 flex-1 content-start">
          {question.answers.map((a, i) => (
            <button
              key={a.id}
              onClick={() => handleAnswer(a.id)}
              disabled={!!selectedAnswer}
              className="rounded-xl p-4 sm:p-5 text-center transition-all active:scale-95 disabled:opacity-70 min-h-[80px] sm:min-h-[100px] flex flex-col items-center justify-center gap-1"
              style={{
                backgroundColor:
                  selectedAnswer === a.id
                    ? ANSWER_COLORS[i].shadow
                    : ANSWER_COLORS[i].bg,
                boxShadow: selectedAnswer
                  ? "none"
                  : `0 4px 0 ${ANSWER_COLORS[i].shadow}`,
              }}
            >
              <span className="text-white/70 text-xs font-black">
                {ANSWER_COLORS[i].label}
              </span>
              <span className="text-white font-black text-sm sm:text-base leading-tight">
                {a.text}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ANSWERED - waiting for results
  if (phase === "answered" && answerResult) {
    const isCorrect = answerResult.correct;
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 gap-3"
        style={{
          background: isCorrect
            ? "linear-gradient(135deg, #059669, #10b981)"
            : "linear-gradient(135deg, #dc2626, #ef4444)",
        }}
      >
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center bg-white/20 mb-2"
        >
          {isCorrect ? (
            <Check className="h-16 w-16 text-white" strokeWidth={3} />
          ) : (
            <X className="h-16 w-16 text-white" strokeWidth={3} />
          )}
        </div>
        <h2 className="text-4xl font-black text-white">
          {isCorrect ? "Đúng!" : "Sai!"}
        </h2>
        {isCorrect && (
          <p className="text-white/90 font-black text-2xl">
            +{answerResult.points} pts
          </p>
        )}
        <p className="text-white/60 font-bold">Total: {totalScore} pts</p>
        <p className="text-white/40 text-sm font-medium mt-4">Đang chờ kết quả...</p>
      </div>
    );
  }

  // RESULT - show correct answer
  if (phase === "result" && question) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        style={{ background: BG_PURPLE }}
      >
        <h2 className="text-xl font-black text-white mb-5">Đáp án đúng</h2>
        <div className="w-full max-w-sm space-y-3">
          {question.answers.map((a, i) => (
            <div
              key={a.id}
              className={`rounded-xl p-4 text-center transition-all ${
                a.id === correctAnswerId
                  ? "ring-4 ring-white scale-105 shadow-lg"
                  : "opacity-40"
              }`}
              style={{ backgroundColor: ANSWER_COLORS[i].bg }}
            >
              <span className="text-white font-black">{a.text}</span>
              {a.id === correctAnswerId && (
                <Check className="h-5 w-5 text-white inline-block ml-2" />
              )}
            </div>
          ))}
        </div>
        <p className="text-white/50 font-bold mt-8 text-sm animate-pulse">
          Đang chờ câu tiếp theo...
        </p>
      </div>
    );
  }

  // FINISHED
  if (phase === "finished") {
    const myRank =
      leaderboard.findIndex(
        (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
      ) + 1;
    const rankEmoji = myRank === 1 ? "🥇" : myRank === 2 ? "🥈" : myRank === 3 ? "🥉" : "🏅";

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        style={{ background: BG_PURPLE }}
      >
        <Trophy className="h-14 w-14 text-[#f59e0b] mb-3 drop-shadow-lg" />
        <h1 className="text-3xl font-black text-white mb-1">Game Over!</h1>
        <p className="text-white/70 font-bold text-lg mb-1">
          {rankEmoji} #{myRank} — {totalScore} pts
        </p>
        <p className="text-white/40 text-sm font-medium mb-6">{nickname}</p>

        <div className="w-full max-w-sm bg-white/10 backdrop-blur rounded-2xl p-4 space-y-2 mb-8">
          <p className="text-white/50 text-xs font-bold uppercase tracking-wider px-2 mb-1">
            Top {Math.min(leaderboard.length, 5)}
          </p>
          {leaderboard.slice(0, 5).map((p, i) => {
            const isMe = p.nickname.toLowerCase() === nickname.toLowerCase();
            return (
              <div
                key={p.nickname}
                className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                  isMe ? "bg-white/30 ring-2 ring-white/50" : "bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-white text-xs ${
                      i === 0
                        ? "bg-[#f59e0b]"
                        : i === 1
                          ? "bg-gray-400"
                          : i === 2
                            ? "bg-[#cd7f32]"
                            : "bg-white/20"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="text-white font-bold text-sm">{p.nickname}</span>
                </div>
                <span className="text-white font-black text-sm">{p.score}</span>
              </div>
            );
          })}
        </div>

        <a
          href="/play"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#4ecdc4] text-white font-black rounded-xl shadow-[0_4px_0_#38a89d] hover:bg-[#45b7af] transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Chơi lại
        </a>
      </div>
    );
  }

  return null;
}
