"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, Users, Calendar, Clock, ChevronRight } from "lucide-react";
import { GameRowSkeleton } from "@/components/ui/skeleton";

interface GameSession {
  id: string;
  gameCode: string;
  gameMode: string;
  status: string;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
  questionSet: { id: string; title: string; coverImage: string | null };
  _count: { players: number };
}

const MODE_LABELS: Record<string, string> = {
  CLASSIC: "Classic",
  RACE: "Race",
  BATTLE_ROYALE: "Battle Royale",
  CHALLENGE: "Challenge",
};

const STATUS_STYLES: Record<string, string> = {
  WAITING: "bg-yellow-100 text-yellow-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  FINISHED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs}s`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GamesHistoryPage() {
  const [games, setGames] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchGames(page);
  }, [page]);

  async function fetchGames(p: number) {
    setLoading(true);
    try {
      const res = await fetch(`/api/games?page=${p}`);
      const data = await res.json();
      if (data.success) {
        setGames(data.data.games);
        setPages(data.data.pages);
        setTotal(data.data.total);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-4xl font-black text-[#3a3a5c] mb-2">Game History</h1>
      <p className="text-gray-500 font-medium mb-6">Lịch sử các game bạn đã host</p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <GameRowSkeleton key={i} />
          ))}
        </div>
      ) : games.length === 0 ? (
        <div className="bg-white/80 rounded-2xl p-12 text-center shadow-sm">
          <Trophy className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-[#3a3a5c] mb-2">Chưa có game nào</h2>
          <p className="text-gray-500 mb-6">Host một game để xem lịch sử tại đây</p>
          <Link
            href="/dashboard/host"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4ecdc4] text-white font-extrabold rounded-xl shadow-[0_4px_0_#38a89d]"
          >
            Host Game
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 font-medium mb-4">{total} games</p>
          <div className="space-y-3">
            {games.map((game) => (
              <Link
                key={game.id}
                href={`/dashboard/games/${game.gameCode}`}
                className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-[0_3px_0_#d1d5db] border border-gray-200 hover:shadow-[0_5px_0_#d1d5db] hover:-translate-y-0.5 transition-all group"
              >
                {/* Cover */}
                <div className="w-14 h-14 shrink-0 rounded-xl bg-[#4ecdc4] flex items-center justify-center overflow-hidden">
                  {game.questionSet.coverImage ? (
                    <img
                      src={game.questionSet.coverImage}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white/60 text-xs font-black italic">AE</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-[#3a3a5c] truncate">
                      {game.questionSet.title}
                    </h3>
                    <span
                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLES[game.status] ?? ""}`}
                    >
                      {game.status === "FINISHED" ? "Xong" : game.status === "IN_PROGRESS" ? "Đang chơi" : game.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {game._count.players} players
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDuration(game.startedAt, game.endedAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(game.createdAt)}
                    </span>
                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded font-bold">
                      {MODE_LABELS[game.gameMode] ?? game.gameMode}
                    </span>
                    <span className="font-mono text-gray-300">#{game.gameCode}</span>
                  </div>
                </div>

                <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-[#7c5cbf] transition-colors shrink-0" />
              </Link>
            ))}
          </div>

          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-white border-2 border-gray-200 text-[#3a3a5c] disabled:opacity-40 hover:border-[#7c5cbf] transition-colors"
              >
                ← Trước
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-lg font-bold text-sm transition-colors ${
                    p === page
                      ? "bg-[#7c5cbf] text-white shadow-[0_3px_0_#5e3d9e]"
                      : "bg-white border-2 border-gray-200 text-[#3a3a5c] hover:border-[#7c5cbf]"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="px-4 py-2 rounded-lg font-bold text-sm bg-white border-2 border-gray-200 text-[#3a3a5c] disabled:opacity-40 hover:border-[#7c5cbf] transition-colors"
              >
                Sau →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
