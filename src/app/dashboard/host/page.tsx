"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface QuestionSet {
  id: string;
  title: string;
  _count: { questions: number };
}

export default function HostPage() {
  const router = useRouter();
  const [sets, setSets] = useState<QuestionSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/sets")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setSets(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleHost(setId: string) {
    setCreating(setId);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionSetId: setId }),
      });
      const data = await res.json();
      if (data.success) {
        router.push(`/dashboard/host/${data.data.code}`);
      }
    } finally {
      setCreating(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-4xl font-black text-[#3a3a5c] mb-6">
        Select a Set to Host
      </h1>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between bg-white rounded-xl p-4 shadow-sm border border-gray-100">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48 bg-gray-200" />
                <Skeleton className="h-4 w-24 bg-gray-200" />
              </div>
              <Skeleton className="h-10 w-20 bg-gray-200" />
            </div>
          ))}
        </div>
      ) : sets.length === 0 ? (
        <div className="bg-[#e0e0e0] rounded-2xl border-2 border-[#ccc] p-10 text-center shadow-[0_4px_0_#bbb]">
          <p className="text-xl font-black text-[#3a3a5c] mb-4">
            Bạn chưa có set nào!
          </p>
          <a
            href="/dashboard/sets/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7c5cbf] text-white font-extrabold rounded-xl shadow-[0_4px_0_#5e3d9e]"
          >
            Tạo Set mới
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {sets.map((set) => (
            <div
              key={set.id}
              className="flex items-center justify-between bg-white rounded-xl p-4 shadow-[0_3px_0_#d1d5db] border border-gray-200"
            >
              <div>
                <h3 className="font-black text-[#3a3a5c] text-lg">
                  {set.title}
                </h3>
                <p className="text-sm text-gray-500">
                  {set._count.questions} câu hỏi
                </p>
              </div>
              <button
                onClick={() => handleHost(set.id)}
                disabled={
                  creating !== null || set._count.questions === 0
                }
                className="flex items-center gap-2 px-5 py-2.5 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-gray-300 text-white font-extrabold rounded-xl transition-colors shadow-[0_4px_0_#38a89d] disabled:shadow-[0_4px_0_#aaa]"
              >
                <Play className="h-5 w-5 fill-white" />
                {creating === set.id ? "Đang tạo..." : "Host"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
