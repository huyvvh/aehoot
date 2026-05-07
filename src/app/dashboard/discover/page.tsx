"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search } from "lucide-react";
import { SetCard, SetCardData } from "@/components/sets/set-card";
import { SetCardSkeleton } from "@/components/ui/skeleton";

export default function DiscoverPage() {
  const [sets, setSets] = useState<SetCardData[]>([]);
  const [query, setQuery] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSets = useCallback(async (q: string, p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/sets/discover?${params}`);
      const data = await res.json();
      if (data.success) {
        setSets(data.data.sets);
        setPages(data.data.pages);
        setTotal(data.data.total);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSets(query, page);
  }, [query, page, fetchSets]);

  function handleInputChange(value: string) {
    setInputValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setQuery(value);
    }, 400);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPage(1);
    setQuery(inputValue);
  }

  function handleFavoriteToggle(id: string, favorited: boolean) {
    setSets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isFavorited: favorited } : s))
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-4xl font-black text-[#3a3a5c] mb-2">Discover</h1>
      <p className="text-gray-500 font-medium mb-6">Khám phá và chơi các bộ câu hỏi công khai</p>

      {/* Search bar */}
      <form onSubmit={handleSearch} className="flex gap-3 mb-8">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Tìm kiếm theo tên hoặc mô tả..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4ecdc4] focus:outline-none font-medium text-[#3a3a5c] bg-white"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold rounded-xl transition-colors shadow-[0_4px_0_#5e3d9e]"
        >
          Tìm
        </button>
      </form>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SetCardSkeleton key={i} />
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="bg-white/80 rounded-2xl p-12 text-center shadow-sm">
          <p className="text-5xl mb-4">🔍</p>
          <h2 className="text-2xl font-black text-[#3a3a5c] mb-2">
            {query ? "Không tìm thấy kết quả" : "Chưa có bộ câu hỏi công khai"}
          </h2>
          {query && (
            <p className="text-gray-500">
              Thử tìm với từ khoá khác hoặc{" "}
              <button
                onClick={() => { setInputValue(""); setQuery(""); setPage(1); }}
                className="text-[#7c5cbf] font-bold underline"
              >
                xem tất cả
              </button>
            </p>
          )}
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 font-medium mb-4">
            {total} bộ câu hỏi{query ? ` cho "${query}"` : ""}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map((set) => (
              <SetCard
                key={set.id}
                set={set}
                showFavorite
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>

          {/* Pagination */}
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
