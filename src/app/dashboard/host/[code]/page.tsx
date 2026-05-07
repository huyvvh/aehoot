"use client";

import { use, useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "@/hooks/use-socket";
import { AVATARS } from "@/lib/avatars";
import { Users, Play, Copy, ArrowUp, ArrowDown, Minus } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import Image from "next/image";

interface Player {
  nickname: string;
  score: number;
  avatarId: string;
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
  leaderboard: Player[];
  answeredCount: number;
  totalPlayers: number;
}

type GamePhase = "lobby" | "playing" | "question-results" | "finished";

const ANSWER_CONFIGS = [
  { bg: "#e21b3c", shadow: "#b8172f", label: "▲" },
  { bg: "#1368ce", shadow: "#0f54a8", label: "◆" },
  { bg: "#d89e00", shadow: "#b07e00", label: "●" },
  { bg: "#26890c", shadow: "#1d6a09", label: "■" },
];

const BG_DARK = "#46178f";

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
  const prevLeaderboard = useRef<Player[]>([]);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit("host:create-room", { code });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (socket as any).data = { gameCode: code };

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

    socket.on("game:player-answered", (data: { answeredCount: number }) => {
      setAnsweredCount(data.answeredCount);
    });

    socket.on("game:question-ended", (data: QuestionEndData) => {
      prevLeaderboard.current = leaderboard;
      setResults(data);
      setLeaderboard(data.leaderboard);
      setPhase("question-results");
    });

    socket.on("game:ended", (data: { leaderboard: Player[] }) => {
      prevLeaderboard.current = leaderboard;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, connected, code]);

  useEffect(() => {
    if (phase !== "playing" || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); return 0; }
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

  useEffect(() => {
    if (phase === "finished") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  // Helper: rank change
  function getRankChange(nickname: string, currentRank: number): number {
    const prev = prevLeaderboard.current;
    if (!prev.length) return 0;
    const oldRank = prev.findIndex((p) => p.nickname === nickname);
    if (oldRank === -1) return 0;
    return oldRank - currentRank; // positive = moved up
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (phase === "lobby") {
    return (
      <div
        className="fixed inset-0 flex"
        style={{ background: BG_DARK }}
      >
        {/* Left panel — PIN + QR */}
        <div className="w-[320px] flex-shrink-0 flex flex-col items-center justify-center p-8 border-r border-white/10">
          <div className="bg-white rounded-2xl p-6 w-full text-center shadow-2xl mb-4">
            <p className="text-gray-500 font-bold text-sm mb-1">Game PIN</p>
            <h1 className="text-5xl font-black text-[#46178f] tracking-[0.15em] mb-4">
              {code}
            </h1>
            <QRCodeSVG value={joinUrl} size={140} className="mx-auto" />
          </div>
          <button
            onClick={copyCode}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-lg transition-colors mb-2"
          >
            <Copy className="h-4 w-4" />
            Copy PIN
          </button>
          <p className="text-white/30 text-xs text-center break-all">{joinUrl}</p>
        </div>

        {/* Right panel — players */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="flex items-center gap-2 mb-5">
            <Users className="h-5 w-5 text-white/60" />
            <span className="text-white font-black text-xl">{players.length} Players</span>
          </div>

          {players.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-white/50 font-bold">Đang chờ người chơi tham gia...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-4 xl:grid-cols-5 gap-4">
                {players.map((p) => {
                  const avatar = AVATARS.find((a) => a.id === p.avatarId) ?? AVATARS[0];
                  return (
                    <div
                      key={p.nickname}
                      className="flex flex-col items-center gap-2 bg-white/10 rounded-2xl p-3 animate-in fade-in zoom-in-95 duration-300"
                    >
                      <div className="w-14 h-14 rounded-full bg-white/20 p-2">
                        <Image src={avatar.src} alt={avatar.name} width={48} height={48} className="w-full h-full object-contain" />
                      </div>
                      <span className="text-white font-bold text-xs text-center truncate w-full">{p.nickname}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button
              onClick={startGame}
              disabled={players.length === 0}
              className="flex items-center gap-3 px-12 py-4 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-white/20 text-white font-black text-2xl rounded-xl transition-colors shadow-[0_6px_0_#38a89d] disabled:shadow-none active:translate-y-1 active:shadow-[0_2px_0_#38a89d]"
            >
              <Play className="h-7 w-7 fill-white" />
              Start!
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── PLAYING — Kahoot-style full screen ─────────────────────────────────────
  if (phase === "playing" && question) {
    const timerPct = question ? (timeLeft / question.timeLimit) * 100 : 100;
    const radius = 44;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference * (1 - timerPct / 100);
    const timerColor = timeLeft > 10 ? "#4ecdc4" : timeLeft > 5 ? "#f59e0b" : "#ef4444";

    return (
      <div
        className="fixed inset-0 flex flex-col"
        style={{ background: BG_DARK }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3">
          <span className="text-white/70 font-bold">
            Question {question.index + 1} of {question.total}
          </span>
          {/* Circular timer */}
          <div className="relative w-[100px] h-[100px] flex items-center justify-center">
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={timerColor}
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
              />
            </svg>
            <span className="relative text-white font-black text-3xl">{timeLeft}</span>
          </div>
          <span className="text-white/70 font-bold">
            {answeredCount}/{players.length}
          </span>
        </div>

        {/* Question */}
        <div className="flex-1 flex flex-col px-6 gap-4">
          {question.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={question.imageUrl}
              alt=""
              className="max-h-36 w-full object-cover rounded-2xl"
            />
          )}
          <div className="bg-white rounded-2xl px-8 py-6 text-center shadow-xl flex-1 flex items-center justify-center">
            <h2 className="text-3xl font-black text-[#3a3a5c] leading-snug">
              {question.text}
            </h2>
          </div>
        </div>

        {/* Answer tiles */}
        <div className="grid grid-cols-2 gap-3 px-6 pb-6 mt-4">
          {question.answers.map((a, i) => (
            <div
              key={a.id}
              className="rounded-xl px-6 py-5 flex items-center gap-4 shadow-lg"
              style={{
                backgroundColor: ANSWER_CONFIGS[i].bg,
                boxShadow: `0 5px 0 ${ANSWER_CONFIGS[i].shadow}`,
              }}
            >
              <span className="text-white text-2xl font-black w-8 flex-shrink-0">{ANSWER_CONFIGS[i].label}</span>
              <span className="text-white font-black text-lg leading-snug">{a.text}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full bg-white/20">
          <div
            className="h-full transition-all duration-1000"
            style={{ width: `${timerPct}%`, backgroundColor: timerColor }}
          />
        </div>
      </div>
    );
  }

  // ── QUESTION RESULTS — with rank-change animation ─────────────────────────
  if (phase === "question-results" && results) {
    const topFive = results.leaderboard.slice(0, 5);

    return (
      <div
        className="fixed inset-0 flex flex-col"
        style={{ background: BG_DARK }}
      >
        {/* Header */}
        <div className="text-center py-6 px-6">
          <p className="text-white/60 font-bold text-sm mb-1">
            {results.answeredCount}/{results.totalPlayers} trả lời
          </p>
          <h2 className="text-4xl font-black text-white">Kết quả</h2>
        </div>

        {/* Leaderboard rows with rank change */}
        <div className="flex-1 flex flex-col justify-center px-6 max-w-2xl mx-auto w-full space-y-3">
          {topFive.map((p, i) => {
            const change = getRankChange(p.nickname, i);
            const avatar = AVATARS.find((a) => a.id === p.avatarId) ?? AVATARS[0];

            return (
              <div
                key={p.nickname}
                className="flex items-center gap-4 rounded-2xl px-5 py-3 bg-white/10 animate-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {/* Rank badge */}
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-lg flex-shrink-0 ${
                    i === 0 ? "bg-[#f59e0b]" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-[#cd7f32]" : "bg-white/20"
                  }`}
                >
                  {i + 1}
                </span>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-white/20 p-1 flex-shrink-0">
                  <Image src={avatar.src} alt={avatar.name} width={32} height={32} className="w-full h-full object-contain" />
                </div>

                {/* Name */}
                <span className="text-white font-black text-lg flex-1 truncate">{p.nickname}</span>

                {/* Rank change indicator */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {change > 0 ? (
                    <span className="flex items-center gap-1 text-green-400 font-black text-sm">
                      <ArrowUp className="h-4 w-4" />
                      {change}
                    </span>
                  ) : change < 0 ? (
                    <span className="flex items-center gap-1 text-red-400 font-black text-sm">
                      <ArrowDown className="h-4 w-4" />
                      {Math.abs(change)}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-white/30 font-black text-sm">
                      <Minus className="h-4 w-4" />
                    </span>
                  )}
                </div>

                {/* Score */}
                <span className="text-white font-black text-xl flex-shrink-0">{p.score}</span>
              </div>
            );
          })}
        </div>

        {/* Next button */}
        <div className="flex justify-center py-6">
          <button
            onClick={nextQuestion}
            className="px-12 py-4 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-black text-xl rounded-xl transition-colors shadow-[0_5px_0_#38a89d] active:translate-y-1 active:shadow-[0_2px_0_#38a89d]"
          >
            Câu tiếp theo →
          </button>
        </div>
      </div>
    );
  }

  // ── FINISHED — Kahoot-style podium ─────────────────────────────────────────
  if (phase === "finished") {
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    // Podium order: 2nd, 1st, 3rd
    const podiumOrder = [
      top3[1] ? { ...top3[1], rank: 2, height: "h-40", color: "#9e9e9e", delay: "0ms" } : null,
      top3[0] ? { ...top3[0], rank: 1, height: "h-52", color: "#f59e0b", delay: "200ms" } : null,
      top3[2] ? { ...top3[2], rank: 3, height: "h-28", color: "#cd7f32", delay: "100ms" } : null,
    ].filter(Boolean) as Array<{ nickname: string; score: number; avatarId: string; rank: number; height: string; color: string; delay: string }>;

    return (
      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        style={{ background: BG_DARK }}
      >
        {/* Confetti */}
        <ConfettiRain />

        <div className="text-center pt-8 pb-4 px-6">
          <h1 className="text-5xl font-black text-white drop-shadow-lg">Game Over!</h1>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 px-6 pb-0 flex-shrink-0">
          {podiumOrder.map((p) => {
            const avatar = AVATARS.find((a) => a.id === p.avatarId) ?? AVATARS[0];
            return (
              <div
                key={p.nickname}
                className="flex flex-col items-center"
                style={{ animationDelay: p.delay }}
              >
                {/* Avatar above podium */}
                <div
                  className="w-16 h-16 rounded-full bg-white/20 p-2 mb-2"
                  style={{ boxShadow: `0 0 0 4px ${p.color}` }}
                >
                  <Image src={avatar.src} alt={avatar.name} width={56} height={56} className="w-full h-full object-contain" />
                </div>
                <span className="text-white font-black text-sm mb-1 max-w-[80px] text-center truncate">{p.nickname}</span>
                <span className="text-white/70 font-bold text-xs mb-2">{p.score} pts</span>
                {/* Podium block */}
                <div
                  className={`w-24 ${p.height} rounded-t-2xl flex items-center justify-center text-white font-black text-3xl`}
                  style={{ backgroundColor: p.color }}
                >
                  {p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : "🥉"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rest of leaderboard */}
        {rest.length > 0 && (
          <div className="flex-1 overflow-y-auto px-6 pt-4 max-w-xl mx-auto w-full space-y-2">
            {rest.map((p, i) => {
              const avatar = AVATARS.find((a) => a.id === p.avatarId) ?? AVATARS[0];
              return (
                <div key={p.nickname} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2">
                  <span className="text-white/50 font-black text-sm w-6">{i + 4}</span>
                  <div className="w-8 h-8 rounded-full bg-white/20 p-0.5">
                    <Image src={avatar.src} alt={avatar.name} width={28} height={28} className="w-full h-full object-contain" />
                  </div>
                  <span className="text-white font-bold text-sm flex-1 truncate">{p.nickname}</span>
                  <span className="text-white font-black text-sm">{p.score}</span>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-center py-5">
          <a
            href="/dashboard"
            className="px-10 py-3.5 bg-white text-[#46178f] font-black text-lg rounded-xl hover:bg-white/90 transition-colors shadow-lg"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center py-20">
      <div className="w-10 h-10 border-4 border-[#7c5cbf] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Simple CSS confetti using divs
function ConfettiRain() {
  const pieces = Array.from({ length: 30 }, (_, i) => i);
  const colors = ["#f59e0b", "#4ecdc4", "#ef4444", "#3b82f6", "#10b981", "#a855f7", "#f97316"];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {pieces.map((i) => {
        const color = colors[i % colors.length];
        const left = `${(i * 3.3 + Math.sin(i) * 10 + 100) % 100}%`;
        const delay = `${(i * 0.15) % 3}s`;
        const duration = `${2.5 + (i % 5) * 0.4}s`;
        const size = i % 3 === 0 ? 12 : i % 3 === 1 ? 8 : 6;
        return (
          <div
            key={i}
            className="absolute top-0 animate-bounce"
            style={{
              left,
              width: size,
              height: size,
              backgroundColor: color,
              borderRadius: i % 2 === 0 ? "50%" : "2px",
              animationDelay: delay,
              animationDuration: duration,
              transform: `rotate(${i * 13}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
