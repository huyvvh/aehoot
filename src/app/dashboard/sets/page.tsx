"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PenSquare, Search } from "lucide-react";
import { SetCard, SetCardData } from "@/components/sets/set-card";
import { SetCardSkeleton } from "@/components/ui/skeleton";

export default function MySetsPage() {
  const [sets, setSets] = useState<SetCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSets();
  }, []);

  async function fetchSets() {
    try {
      const res = await fetch("/api/sets");
      const data = await res.json();
      if (data.success) setSets(data.data);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-4xl font-black text-[#3a3a5c] mb-6">My Sets</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SetCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-4xl font-black text-[#3a3a5c] mb-6">My Sets</h1>

      {sets.length === 0 ? (
        <div className="bg-[#e0e0e0] rounded-2xl border-2 border-[#ccc] p-10 text-center shadow-[0_4px_0_#bbb]">
          <h2 className="text-2xl font-black text-[#3a3a5c] mb-5">
            You'll Need a Question Set to Host!
          </h2>
          <div className="flex justify-center gap-6">
            <Link
              href="/dashboard/sets/new"
              className="flex items-center gap-2 px-8 py-3.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold text-lg rounded-lg transition-colors shadow-[0_4px_0_#5e3d9e]"
            >
              <PenSquare className="h-5 w-5" />
              Create a Set
            </Link>
            <Link
              href="/dashboard/discover"
              className="flex items-center gap-2 px-8 py-3.5 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-extrabold text-lg rounded-lg transition-colors shadow-[0_4px_0_#38a89d]"
            >
              <Search className="h-5 w-5" />
              Discover Sets
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href="/dashboard/sets/new"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold rounded-lg transition-colors shadow-[0_4px_0_#5e3d9e]"
            >
              <PenSquare className="h-4 w-4" />
              Create a Set
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map((set) => (
              <SetCard
                key={set.id}
                set={{ ...set, isOwner: true }}
                showEdit
                showDelete
                onDelete={(id) => setSets((prev) => prev.filter((s) => s.id !== id))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
