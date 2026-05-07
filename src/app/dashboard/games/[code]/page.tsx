"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Trophy, Users, Clock, BarChart2, Loader2, Check, X } from "lucide-react";

interface PlayerAnswer {
  id: string;
  isCorrect: boolean;
  timeTaken: number;
  selectedAnswer: string;
  question: { text: string };
}

interface Player {
  id: string;
  nickname: string;
  score: number;
  isEliminated: boolean;
  answers: PlayerAnswer[];
}

interface GameReport {
  id: string;
  gameCode: string;
  gameMode: string;
  status: string;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  questionSet: { id: string; title: string; coverImage: string | null };
  players: Player[];
  summary: { totalPlayers: number; avgScore: number };
}

const MEDAL = ["🥇", "🥈", "🥉"];

export default function GameReportPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = use(params);
  const router = useRouter();
  const [report, setReport] = useState<GameReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/games/${code}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.players) setReport(d.data);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="max-w-4xl flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#7c5cbf] animate-spin" />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="max-w-4xl text-center py-20">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-2xl font-black text-[#3a3a5c] mb-4">Không tìm thấy báo cáo</h2>
        <Link href="/dashboard/games" className="text-[#7c5cbf] font-bold underline">
          Quay lại lịch sử
        </Link>
      </div>
    );
  }

  function formatDuration() {
    if (!report!.startedAt || !report!.endedAt) return "—";
    const ms =
      new Date(report!.endedAt).getTime() - new Date(report!.startedAt).getTime();
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }

  return (
    <div className="max-w-4xl">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-[#3a3a5c] mb-5 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Lịch sử
      </button>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_4px_0_#d1d5db] border border-gray-200 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 shrink-0 rounded-xl bg-[#4ecdc4] flex items-center justify-center overflow-hidden">
            {report.questionSet.coverImage ? (
              <img src={report.questionSet.coverImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white/60 text-xs font-black italic">AE</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-[#3a3a5c]">{report.questionSet.title}</h1>
            <p className="text-sm text-gray-400 font-medium mt-0.5">
              Game #{report.gameCode} · {report.gameMode}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6">
          {[
            { icon: Users, label: "Players", value: report.summary.totalPlayers },
            { icon: BarChart2, label: "Avg Score", value: report.summary.avgScore + " pts" },
            { icon: Clock, label: "Duration", value: formatDuration() },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
              <Icon className="h-5 w-5 text-[#7c5cbf] mx-auto mb-1" />
              <p className="text-xl font-black text-[#3a3a5c]">{value}</p>
              <p className="text-xs text-gray-400 font-medium">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard */}
      <h2 className="text-xl font-black text-[#3a3a5c] mb-4 flex items-center gap-2">
        <Trophy className="h-5 w-5 text-[#f59e0b]" />
        Leaderboard
      </h2>

      {report.players.length === 0 ? (
        <div className="bg-white/80 rounded-2xl p-8 text-center shadow-sm text-gray-400 font-medium">
          Không có player nào trong game này.
        </div>
      ) : (
        <div className="space-y-2">
          {report.players.map((player, i) => {
            const accuracy =
              player.answers.length > 0
                ? Math.round(
                    (player.answers.filter((a) => a.isCorrect).length /
                      player.answers.length) *
                      100
                  )
                : 0;
            const isExpanded = expandedPlayer === player.id;

            return (
              <div
                key={player.id}
                className={`bg-white rounded-2xl border border-gray-200 shadow-[0_3px_0_#d1d5db] overflow-hidden ${
                  i === 0 ? "border-[#f59e0b] shadow-[0_3px_0_#d97706]" : ""
                }`}
              >
                <button
                  onClick={() =>
                    setExpandedPlayer(isExpanded ? null : player.id)
                  }
                  className="w-full flex items-center gap-4 p-4 text-left"
                >
                  <span className="text-2xl w-8 text-center shrink-0">
                    {i < 3 ? MEDAL[i] : `#${i + 1}`}
                  </span>
                  <span className="flex-1 font-black text-[#3a3a5c] text-lg">
                    {player.nickname}
                  </span>
                  <div className="flex items-center gap-4 text-sm font-bold">
                    <span className="text-gray-400">{accuracy}% đúng</span>
                    <span className="text-[#7c5cbf] text-xl font-black">
                      {player.score} pts
                    </span>
                  </div>
                  <ChevronLeft
                    className={`h-4 w-4 text-gray-300 transition-transform ${isExpanded ? "-rotate-90" : "rotate-180"}`}
                  />
                </button>

                {isExpanded && player.answers.length > 0 && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-2 space-y-2">
                    {player.answers.map((a, ai) => (
                      <div
                        key={a.id}
                        className="flex items-start gap-3 text-sm"
                      >
                        {a.isCorrect ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <X className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <span className="flex-1 text-gray-600">
                          <span className="font-bold text-gray-400 mr-1">
                            Q{ai + 1}.
                          </span>
                          {a.question.text}
                        </span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {a.timeTaken.toFixed(1)}s
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
