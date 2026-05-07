"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { SetCard, SetCardData } from "@/components/sets/set-card";

export default function FavoritesPage() {
  const [sets, setSets] = useState<SetCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFavorites();
  }, []);

  async function fetchFavorites() {
    try {
      const res = await fetch("/api/favorites");
      const data = await res.json();
      if (data.success) setSets(data.data);
    } finally {
      setLoading(false);
    }
  }

  function handleUnfavorite(id: string) {
    setSets((prev) => prev.filter((s) => s.id !== id));
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-4xl font-black text-[#3a3a5c] mb-6">Favorites</h1>
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#7c5cbf] animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-4xl font-black text-[#3a3a5c] mb-2">Favorites</h1>
      <p className="text-gray-500 font-medium mb-6">Các bộ câu hỏi bạn đã yêu thích</p>

      {sets.length === 0 ? (
        <div className="bg-white/80 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-5xl mb-4">❤️</p>
          <h2 className="text-2xl font-black text-[#3a3a5c] mb-2">Chưa có Favorites</h2>
          <p className="text-gray-500 mb-6">
            Khám phá và nhấn tim vào những bộ câu hỏi bạn thích!
          </p>
          <Link
            href="/dashboard/discover"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold text-lg rounded-xl transition-colors shadow-[0_4px_0_#5e3d9e]"
          >
            <Search className="h-5 w-5" />
            Khám phá ngay
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 font-medium mb-4">{sets.length} bộ câu hỏi</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map((set) => (
              <SetCard
                key={set.id}
                set={{ ...set, isFavorited: true }}
                showFavorite
                onFavoriteToggle={(id, favorited) => {
                  if (!favorited) handleUnfavorite(id);
                }}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
