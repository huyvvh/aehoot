"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart,
  Edit3,
  Play,
  ChevronLeft,
  Globe,
  Lock,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";

interface Answer {
  id: string;
  text: string;
  isCorrect: boolean;
  order: number;
}

interface Question {
  id: string;
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  points: number;
  order: number;
  needsReview?: boolean;
  answers: Answer[];
}

interface SetDetail {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  playCount: number;
  createdAt: string;
  updatedAt: string;
  isFavorited: boolean;
  isOwner: boolean;
  author: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  folder: { id: string; name: string; color: string } | null;
  questions: Question[];
}

const ANSWER_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444"];
const ANSWER_LABELS = ["A", "B", "C", "D"];

export default function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [set, setSet] = useState<SetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    fetchSet();
  }, [id]);

  async function fetchSet() {
    try {
      const res = await fetch(`/api/sets/${id}`);
      const data = await res.json();
      if (data.success) {
        setSet(data.data);
        setFavorited(data.data.isFavorited);
      } else {
        setNotFound(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleFavorite() {
    if (!set || toggling) return;
    setToggling(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionSetId: set.id }),
      });
      const data = await res.json();
      if (data.success) setFavorited(data.data.favorited);
    } finally {
      setToggling(false);
    }
  }

  async function handleHost() {
    if (!set) return;
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionSetId: set.id, gameMode: "CLASSIC" }),
    });
    const data = await res.json();
    if (data.success) {
      router.push(`/dashboard/host?code=${data.data.gameCode}`);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#7c5cbf] animate-spin" />
      </div>
    );
  }

  if (notFound || !set) {
    return (
      <div className="max-w-4xl text-center py-20">
        <p className="text-5xl mb-4">😕</p>
        <h2 className="text-2xl font-black text-[#3a3a5c] mb-4">Set không tồn tại</h2>
        <Link href="/dashboard/discover" className="text-[#7c5cbf] font-bold underline">
          Khám phá các set khác
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-[#3a3a5c] mb-5 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Quay lại
      </button>

      {/* Header card */}
      <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_0_#d1d5db] border border-gray-200 mb-6">
        {/* Cover */}
        <div className="h-48 bg-[#4ecdc4] flex items-center justify-center relative">
          {set.coverImage ? (
            <img src={set.coverImage} alt={set.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white/50 text-6xl font-black italic">AEHoot</span>
          )}
          {/* Public/Private badge */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 text-white text-xs font-bold px-2.5 py-1 rounded-full">
            {set.isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
            {set.isPublic ? "Public" : "Private"}
          </div>
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-black text-[#3a3a5c] truncate">{set.title}</h1>
              {set.description && (
                <p className="text-gray-500 mt-1.5 text-sm leading-relaxed">{set.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="text-sm font-bold text-gray-500">
                  {set.questions.length} câu hỏi
                </span>
                <span className="text-gray-300">•</span>
                <span className="text-sm font-bold text-gray-500 flex items-center gap-1">
                  <Play className="h-3.5 w-3.5" />
                  {set.playCount} lượt chơi
                </span>
                {set.folder && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold text-white"
                      style={{ backgroundColor: set.folder.color }}
                    >
                      {set.folder.name}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                bởi{" "}
                <span className="font-bold text-gray-500">
                  {set.author.displayName || set.author.username}
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {set.isPublic && (
                <button
                  onClick={handleFavorite}
                  disabled={toggling}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-[0_3px_0_rgba(0,0,0,0.15)] ${
                    favorited
                      ? "bg-red-500 hover:bg-red-600 text-white shadow-[0_3px_0_#b91c1c]"
                      : "bg-gray-100 hover:bg-gray-200 text-gray-600 shadow-[0_3px_0_#d1d5db]"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${favorited ? "fill-white" : ""}`} />
                  {favorited ? "Đã thích" : "Yêu thích"}
                </button>
              )}
              {set.isOwner && (
                <Link
                  href={`/dashboard/sets/${set.id}/explanations`}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#f3eefe] hover:bg-[#e9dffb] text-[#7c5cbf] font-bold text-sm rounded-xl transition-colors shadow-[0_3px_0_#d6c7f0]"
                >
                  <Sparkles className="h-4 w-4" />
                  Giải thích AI
                </Link>
              )}
              {set.isOwner && (
                <Link
                  href={`/dashboard/sets/${set.id}/edit`}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-bold text-sm rounded-xl transition-colors shadow-[0_3px_0_#38a89d]"
                >
                  <Edit3 className="h-4 w-4" />
                  Edit
                </Link>
              )}
              <button
                onClick={handleHost}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold text-sm rounded-xl transition-colors shadow-[0_3px_0_#5e3d9e]"
              >
                <Play className="h-4 w-4 fill-white" />
                Host
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Questions list */}
      <h2 className="text-xl font-black text-[#3a3a5c] mb-4">
        Câu hỏi ({set.questions.length})
      </h2>
      <div className="space-y-3">
        {set.questions.map((q, qi) => (
          <div
            key={q.id}
            className="bg-white rounded-2xl p-5 shadow-[0_3px_0_#d1d5db] border border-gray-200"
          >
            <div className="flex items-start gap-3 mb-4">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#7c5cbf] text-white text-sm font-black flex items-center justify-center">
                {qi + 1}
              </span>
              <div className="flex-1">
                <p className="font-bold text-[#3a3a5c] text-base">{q.text}</p>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-400 font-medium">
                  <span>⏱ {q.timeLimit}s</span>
                  <span>⭐ {q.points} điểm</span>
                  {q.needsReview && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-bold">
                      ⚠ Cần rà soát (tài liệu nguồn đã đổi)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.answers.map((a, ai) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-white font-bold text-sm"
                  style={{ backgroundColor: ANSWER_COLORS[ai % 4] }}
                >
                  <span className="shrink-0 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs font-black">
                    {ANSWER_LABELS[ai]}
                  </span>
                  <span className="flex-1 truncate">{a.text}</span>
                  {a.isCorrect && (
                    <Check className="h-4 w-4 shrink-0 bg-white/20 rounded-full p-0.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
