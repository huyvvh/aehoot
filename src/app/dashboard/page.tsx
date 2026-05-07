"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { getRandomAvatar } from "@/lib/avatars";
import { Play, Trophy, BookOpen, Clock, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SetCard, SetCardData } from "@/components/sets/set-card";
import { Skeleton } from "@/components/ui/skeleton";

function OrangeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block bg-[#ffa726] text-white font-black text-base px-5 py-1.5 rounded-lg shadow-[0_3px_0_#e08f1c,inset_0_1px_0_rgba(255,255,255,0.3)] italic border-2 border-[#e08f1c]">
      {children}
    </span>
  );
}

interface RecentGame {
  id: string;
  gameCode: string;
  gameMode: string;
  status: string;
  createdAt: string;
  questionSet: { title: string };
  _count: { players: number };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const displayName = user?.displayName || "User";
  const avatar = getRandomAvatar(displayName);

  const [recentSets, setRecentSets] = useState<SetCardData[]>([]);
  const [recentGames, setRecentGames] = useState<RecentGame[]>([]);
  const [stats, setStats] = useState({ sets: 0, games: 0 });
  const [loadingSets, setLoadingSets] = useState(true);
  const [loadingGames, setLoadingGames] = useState(true);

  useEffect(() => {
    fetch("/api/sets")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRecentSets(d.data.slice(0, 3));
          setStats((s) => ({ ...s, sets: d.data.length }));
        }
      })
      .finally(() => setLoadingSets(false));

    fetch("/api/games?page=1")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setRecentGames(d.data.games.slice(0, 3));
          setStats((s) => ({ ...s, games: d.data.total }));
        }
      })
      .finally(() => setLoadingGames(false));
  }, []);

  return (
    <div className="space-y-5 max-w-5xl">
      {/* User Profile */}
      <div className="flex flex-col sm:flex-row items-start gap-5">
        <div className="shrink-0">
          <div className="w-[120px] h-[120px] rounded-2xl bg-white/30 p-2 shadow-lg">
            <Image src={avatar.src} alt={avatar.name} width={120} height={120} className="w-full h-full" />
          </div>
        </div>
        <div className="flex-1 space-y-3">
          <div className="bg-[#7c5cbf] rounded-2xl px-6 py-4 shadow-[0_4px_0_#5e3d9e]">
            <h1 className="text-2xl font-black text-white">{displayName}</h1>
            <div className="flex items-center gap-4 mt-1">
              <span className="text-white/60 text-sm font-bold flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {stats.sets} sets
              </span>
              <span className="text-white/60 text-sm font-bold flex items-center gap-1">
                <Trophy className="h-3.5 w-3.5" />
                {stats.games} games hosted
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/host"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold text-sm rounded-xl transition-colors shadow-[0_4px_0_#5e3d9e]"
            >
              <Play className="h-4 w-4 fill-white" />
              Play Now!
            </Link>
            <Link
              href="/dashboard/sets/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-extrabold text-sm rounded-xl transition-colors shadow-[0_4px_0_#38a89d]"
            >
              + Create Set
            </Link>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-[#d4a5e0]/50 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3">
          <OrangeBadge>History</OrangeBadge>
          {recentGames.length > 0 && (
            <Link
              href="/dashboard/games"
              className="text-sm font-bold text-[#7c5cbf] hover:underline flex items-center gap-1"
            >
              Xem tất cả <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {loadingGames ? (
          <div className="bg-[#d4a5e0]/40 px-5 py-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between bg-white/60 rounded-xl px-4 py-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-40 bg-gray-300/50" />
                  <Skeleton className="h-3 w-28 bg-gray-300/40" />
                </div>
                <Skeleton className="h-5 w-12 bg-gray-300/50 rounded-full" />
              </div>
            ))}
          </div>
        ) : recentGames.length === 0 ? (
          <div className="bg-[#d4a5e0]/40 px-5 py-10 text-center">
            <p className="text-[#3a3a5c] font-bold text-lg">No Games Played Yet</p>
          </div>
        ) : (
          <div className="bg-[#d4a5e0]/40 px-5 py-3 space-y-2">
            {recentGames.map((game) => (
              <Link
                key={game.id}
                href={`/dashboard/games/${game.gameCode}`}
                className="flex items-center justify-between bg-white/60 hover:bg-white/80 rounded-xl px-4 py-3 transition-colors"
              >
                <div>
                  <p className="font-black text-[#3a3a5c] text-sm">{game.questionSet.title}</p>
                  <p className="text-xs text-gray-400 font-medium flex items-center gap-2 mt-0.5">
                    <Clock className="h-3 w-3" />
                    {formatDate(game.createdAt)}
                    <span>·</span>
                    {game._count.players} players
                  </p>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    game.status === "FINISHED"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {game.status === "FINISHED" ? "Xong" : game.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* My Sets Section */}
      <div className="bg-white/30 rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-3">
          <OrangeBadge>My Sets</OrangeBadge>
          {recentSets.length > 0 && (
            <Link
              href="/dashboard/sets"
              className="text-sm font-bold text-[#7c5cbf] hover:underline flex items-center gap-1"
            >
              Xem tất cả <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {loadingSets ? (
          <div className="bg-white/20 px-5 py-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 space-y-2">
                <Skeleton className="h-5 w-3/4 bg-gray-200" />
                <Skeleton className="h-4 w-1/2 bg-gray-200" />
              </div>
            ))}
          </div>
        ) : recentSets.length === 0 ? (
          <div className="bg-white/20 px-5 py-10 text-center">
            <p className="text-[#3a3a5c] font-bold text-lg mb-4">No Sets Created Yet</p>
            <div className="flex justify-center gap-3 flex-wrap">
              <Link
                href="/dashboard/sets/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold rounded-xl transition-colors shadow-[0_4px_0_#5e3d9e]"
              >
                Create a Set
              </Link>
              <Link
                href="/dashboard/discover"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-extrabold rounded-xl transition-colors shadow-[0_4px_0_#38a89d]"
              >
                Discover Sets
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white/20 px-5 pb-5 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentSets.map((set) => (
                <SetCard key={set.id} set={{ ...set, isOwner: true }} showEdit />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
