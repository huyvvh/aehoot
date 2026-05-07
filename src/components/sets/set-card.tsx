"use client";

import Link from "next/link";
import { Heart, Edit3, Trash2, Play } from "lucide-react";
import { useState } from "react";

export interface SetCardData {
  id: string;
  title: string;
  description: string | null;
  coverImage: string | null;
  isPublic: boolean;
  playCount: number;
  _count: { questions: number };
  folder?: { id: string; name: string; color: string } | null;
  author?: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  isFavorited?: boolean;
  isOwner?: boolean;
}

interface SetCardProps {
  set: SetCardData;
  showFavorite?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  onDelete?: (id: string) => void;
  onFavoriteToggle?: (id: string, favorited: boolean) => void;
}

export function SetCard({
  set,
  showFavorite = false,
  showEdit = false,
  showDelete = false,
  onDelete,
  onFavoriteToggle,
}: SetCardProps) {
  const [favorited, setFavorited] = useState(set.isFavorited ?? false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    if (toggling) return;
    setToggling(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionSetId: set.id }),
      });
      const data = await res.json();
      if (data.success) {
        setFavorited(data.data.favorited);
        onFavoriteToggle?.(set.id, data.data.favorited);
      }
    } finally {
      setToggling(false);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("Bạn có chắc muốn xoá set này?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sets/${set.id}`, { method: "DELETE" });
      if (res.ok) onDelete?.(set.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Link
      href={`/dashboard/sets/${set.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-[0_4px_0_#d1d5db] border border-gray-200 hover:shadow-[0_6px_0_#d1d5db] hover:-translate-y-0.5 transition-all block"
    >
      {/* Cover */}
      <div className="h-32 bg-[#4ecdc4] flex items-center justify-center relative overflow-hidden">
        {set.coverImage ? (
          <img src={set.coverImage} alt={set.title} className="w-full h-full object-cover" />
        ) : (
          <span className="text-white/60 text-5xl font-black italic">AEHoot</span>
        )}
        {/* Favorite button */}
        {showFavorite && (
          <button
            onClick={handleFavorite}
            disabled={toggling}
            className={`absolute top-2 right-2 p-1.5 rounded-full transition-all shadow-md ${
              favorited
                ? "bg-red-500 text-white"
                : "bg-white/80 text-gray-400 hover:text-red-400"
            }`}
          >
            <Heart className={`h-4 w-4 ${favorited ? "fill-white" : ""}`} />
          </button>
        )}
        {/* Play count badge */}
        <div className="absolute bottom-2 left-2 bg-black/40 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
          <Play className="h-3 w-3 fill-white" />
          {set.playCount}
        </div>
      </div>

      {/* Body */}
      <div className="p-4">
        <h3 className="font-black text-[#3a3a5c] text-lg truncate">{set.title}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{set._count.questions} câu hỏi</p>

        {set.author && !set.isOwner && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">
            bởi {set.author.displayName || set.author.username}
          </p>
        )}

        {set.folder && (
          <span
            className="inline-block mt-2 px-2 py-0.5 rounded text-xs font-bold text-white"
            style={{ backgroundColor: set.folder.color }}
          >
            {set.folder.name}
          </span>
        )}

        {(showEdit || showDelete) && (
          <div className="flex items-center gap-2 mt-3" onClick={(e) => e.preventDefault()}>
            {showEdit && (
              <Link
                href={`/dashboard/sets/${set.id}/edit`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-bold text-sm rounded-lg transition-colors shadow-[0_3px_0_#38a89d]"
                onClick={(e) => e.stopPropagation()}
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </Link>
            )}
            {showDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center justify-center p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-[0_3px_0_#b91c1c] disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
