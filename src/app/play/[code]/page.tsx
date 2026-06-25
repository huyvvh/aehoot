"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/use-socket";
import { AVATARS, AvatarId } from "@/lib/avatars";
import { playTick, playCorrect, playWrong, playQuestionStart } from "@/lib/sounds";
import { Trophy, Clock, Check, X, LogOut } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

interface PlayerInfo {
  nickname: string;
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

interface AnswerResult {
  correct: boolean;
  points: number;
  timeTaken: number;
}

type PlayerPhase =
  | "join"
  | "avatar"
  | "waiting"
  | "question"
  | "answered"
  | "result"
  | "finished";

const ANSWER_COLORS = [
  { bg: "#e21b3c", shadow: "#b8172f", label: "▲" },
  { bg: "#1368ce", shadow: "#0f54a8", label: "◆" },
  { bg: "#d89e00", shadow: "#b07e00", label: "●" },
  { bg: "#26890c", shadow: "#1d6a09", label: "■" },
];

const BG_DARK = "#46178f";

export default function PlayerGamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const { socket, connected } = useSocket();
  const [phase, setPhase] = useState<PlayerPhase>("join");
  const [nickname, setNickname] = useState("");
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId>(AVATARS[0].id);
  const [error, setError] = useState("");
  const [joining, setJoining] = useState(false);
  const [waitingPlayers, setWaitingPlayers] = useState<PlayerInfo[]>([]);
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState<
    { nickname: string; score: number; avatarId: string }[]
  >([]);
  const [correctAnswerId, setCorrectAnswerId] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{
    body: string;
    citations: { quote: string }[];
  } | null>(null);

  useEffect(() => {
    if (phase === "join" || phase === "avatar" || phase === "finished") return;
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

    socket.on("game:player-joined", (data: { players: PlayerInfo[] }) => {
      setWaitingPlayers(data.players);
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
      setExplanation(null);
      playQuestionStart();
    });

    socket.on("game:answer-result", (result: AnswerResult) => {
      setAnswerResult(result);
      setTotalScore((s) => s + result.points);
      setPhase("answered");
      if (result.correct) playCorrect(); else playWrong();
    });

    socket.on(
      "game:question-ended",
      (data: {
        correctAnswerId: string;
        explanation?: { body: string; citations: { quote: string }[] } | null;
      }) => {
        setCorrectAnswerId(data.correctAnswerId);
        setExplanation(data.explanation ?? null);
        setPhase("result");
      }
    );

    socket.on(
      "game:ended",
      (data: { leaderboard: { nickname: string; score: number; avatarId: string }[] }) => {
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
      socket.off("game:player-joined");
      socket.off("game:question");
      socket.off("game:answer-result");
      socket.off("game:question-ended");
      socket.off("game:ended");
      socket.off("game:host-left");
    };
  }, [socket, connected]);

  useEffect(() => {
    if (phase !== "question" || timeLeft <= 0) return;
    playTick(timeLeft);
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); return 0; }
        playTick(t - 1);
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, timeLeft]);

  const handleNicknameSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = nickname.trim();
      if (!name) return;
      setPhase("avatar");
    },
    [nickname]
  );

  const handleJoin = useCallback(() => {
    const name = nickname.trim();
    if (!socket || !name || !connected) return;
    setJoining(true);
    setError("");
    socket.emit("player:join", { code, nickname: name, avatarId: selectedAvatarId });
  }, [socket, code, nickname, selectedAvatarId, connected]);

  const handleAnswer = useCallback(
    (answerId: string) => {
      if (!socket || selectedAnswer) return;
      setSelectedAnswer(answerId);
      socket.emit("player:answer", { code, answerId });
    },
    [socket, code, selectedAnswer]
  );

  const timerColor =
    timeLeft > 10 ? "#4ecdc4" : timeLeft > 5 ? "#f59e0b" : "#ef4444";
  const timerPct = question ? (timeLeft / question.timeLimit) * 100 : 100;

  // JOIN SCREEN — enter nickname
  if (phase === "join") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        style={{ background: BG_DARK }}
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

          <form onSubmit={handleNicknameSubmit} className="space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => { setNickname(e.target.value); setError(""); }}
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
              disabled={!nickname.trim() || !connected}
              className="w-full h-14 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-gray-400 disabled:shadow-none text-white font-black text-xl rounded-xl transition-all shadow-[0_5px_0_#38a89d] active:shadow-[0_2px_0_#38a89d] active:translate-y-[3px]"
            >
              Tiếp theo
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

  // AVATAR PICKER
  if (phase === "avatar") {
    const selectedAvatar = AVATARS.find((a) => a.id === selectedAvatarId)!;
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        style={{ background: BG_DARK }}
      >
        <div className="relative z-10 w-full max-w-sm">
          <h2 className="text-2xl font-black text-white text-center mb-1">Chọn avatar</h2>
          <p className="text-white/50 font-bold text-center mb-6 text-sm">Xin chào, {nickname}!</p>

          {/* Preview */}
          <div className="flex justify-center mb-5">
            <div className="w-24 h-24 rounded-full bg-white/20 p-3 ring-4 ring-white/60">
              <Image src={selectedAvatar.src} alt={selectedAvatar.name} width={80} height={80} className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatarId(avatar.id)}
                className={`w-full aspect-square rounded-2xl p-2 transition-all ${
                  selectedAvatarId === avatar.id
                    ? "bg-white ring-3 ring-white scale-110 shadow-lg"
                    : "bg-white/15 hover:bg-white/25"
                }`}
              >
                <Image src={avatar.src} alt={avatar.name} width={48} height={48} className="w-full h-full object-contain" />
              </button>
            ))}
          </div>

          <button
            onClick={handleJoin}
            disabled={joining || !connected}
            className="w-full h-14 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-gray-400 text-white font-black text-xl rounded-xl transition-all shadow-[0_5px_0_#38a89d]"
          >
            {joining ? "Đang kết nối..." : "Join!"}
          </button>

          {error && (
            <p className="text-red-300 text-center font-bold text-sm bg-red-900/20 rounded-lg py-2 px-3 mt-3">
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // WAITING — show player cards with varying sizes
  if (phase === "waiting") {
    const PLAYER_CARD_SIZES = [
      { card: "p-3 rounded-2xl", avatar: "w-14 h-14", img: 48, text: "text-sm" },
      { card: "p-2 rounded-xl",  avatar: "w-10 h-10", img: 32, text: "text-xs" },
      { card: "p-4 rounded-2xl", avatar: "w-16 h-16", img: 56, text: "text-sm" },
      { card: "p-2 rounded-xl",  avatar: "w-11 h-11", img: 36, text: "text-xs" },
      { card: "p-3 rounded-2xl", avatar: "w-12 h-12", img: 40, text: "text-xs" },
    ];

    return (
      <div
        className="min-h-screen flex flex-col px-4 py-8"
        style={{ background: BG_DARK }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="text-2xl font-black text-white mb-1">You&apos;re in!</h2>
          <p className="text-white/60 font-bold text-center text-sm">Đang chờ host bắt đầu...</p>
        </div>

        {waitingPlayers.length > 0 && (
          <div className="w-full max-w-sm mx-auto">
            <p className="text-white/40 text-xs font-bold uppercase tracking-wider text-center mb-3">
              {waitingPlayers.length} người đã tham gia
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {waitingPlayers.map((p, idx) => {
                const avatar = AVATARS.find((a) => a.id === p.avatarId) ?? AVATARS[0];
                const isMe = p.nickname.toLowerCase() === nickname.toLowerCase();
                const sz = PLAYER_CARD_SIZES[idx % PLAYER_CARD_SIZES.length];
                const rotate = (idx % 5 - 2) * 2;
                return (
                  <div
                    key={p.nickname}
                    className={`flex flex-col items-center gap-1.5 ${sz.card} ${
                      isMe ? "bg-white/30 ring-2 ring-white shadow-lg" : "bg-white/10"
                    }`}
                    style={{ transform: `rotate(${rotate}deg)` }}
                  >
                    <div className={`${sz.avatar} rounded-full bg-white/20 p-1.5`}>
                      <Image src={avatar.src} alt={avatar.name} width={sz.img} height={sz.img} className="w-full h-full object-contain" />
                    </div>
                    <span className={`${sz.text} font-bold truncate max-w-[80px] text-center ${isMe ? "text-white" : "text-white/70"}`}>
                      {p.nickname}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // QUESTION
  if (phase === "question" && question) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: BG_DARK }}>
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
            className="flex items-center gap-1.5 rounded-full px-4 py-1.5 font-black text-lg"
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
                backgroundColor: selectedAnswer === a.id ? ANSWER_COLORS[i].shadow : ANSWER_COLORS[i].bg,
                boxShadow: selectedAnswer ? "none" : `0 4px 0 ${ANSWER_COLORS[i].shadow}`,
              }}
            >
              <span className="text-white/70 text-xs font-black">{ANSWER_COLORS[i].label}</span>
              <span className="text-white font-black text-sm sm:text-base leading-tight">{a.text}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ANSWERED
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
        <div className="w-28 h-28 rounded-full flex items-center justify-center bg-white/20 mb-2">
          {isCorrect ? (
            <Check className="h-16 w-16 text-white" strokeWidth={3} />
          ) : (
            <X className="h-16 w-16 text-white" strokeWidth={3} />
          )}
        </div>
        <h2 className="text-4xl font-black text-white">{isCorrect ? "Đúng!" : "Sai!"}</h2>
        {isCorrect && (
          <p className="text-white/90 font-black text-2xl">+{answerResult.points} pts</p>
        )}
        <p className="text-white/60 font-bold">Total: {totalScore} pts</p>
        <p className="text-white/40 text-sm font-medium mt-4">Đang chờ kết quả...</p>
      </div>
    );
  }

  // RESULT
  if (phase === "result" && question) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        style={{ background: BG_DARK }}
      >
        <h2 className="text-xl font-black text-white mb-5">Đáp án đúng</h2>
        <div className="w-full max-w-sm space-y-3">
          {question.answers.map((a, i) => (
            <div
              key={a.id}
              className={`rounded-xl p-4 text-center transition-all ${
                a.id === correctAnswerId ? "ring-4 ring-white scale-105 shadow-lg" : "opacity-40"
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

        {explanation && (
          <div className="w-full max-w-sm mt-6 rounded-xl bg-white/10 p-4 text-left">
            <p className="text-white font-black text-sm mb-2">💡 Vì sao?</p>
            <p className="text-white/85 text-sm leading-relaxed whitespace-pre-line">
              {explanation.body}
            </p>
            {explanation.citations.length > 0 && (
              <div className="mt-3 border-t border-white/15 pt-3 space-y-2">
                <p className="text-white/50 text-xs font-bold">Nguồn trích dẫn</p>
                {explanation.citations.map((c, i) => (
                  <p
                    key={i}
                    className="text-white/60 text-xs italic border-l-2 border-white/30 pl-2"
                  >
                    “{c.quote}”
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

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
    const myAvatar = AVATARS.find((a) => a.id === selectedAvatarId) ?? AVATARS[0];

    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
        style={{ background: BG_DARK }}
      >
        <div className="w-20 h-20 rounded-full bg-white/20 p-3 mb-3">
          <Image src={myAvatar.src} alt={myAvatar.name} width={64} height={64} className="w-full h-full object-contain" />
        </div>
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
            const av = AVATARS.find((a) => a.id === p.avatarId) ?? AVATARS[0];
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
                      i === 0 ? "bg-[#f59e0b]" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-[#cd7f32]" : "bg-white/20"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white/20 p-0.5">
                    <Image src={av.src} alt={av.name} width={24} height={24} className="w-full h-full object-contain" />
                  </div>
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
