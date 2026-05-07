"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit3, FolderOpen, X, Check } from "lucide-react";

interface Folder {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  _count: { questionSets: number };
}

const FOLDER_COLORS = [
  "#6366f1",
  "#7c5cbf",
  "#ec4899",
  "#ef4444",
  "#f59e0b",
  "#10b981",
  "#3b82f6",
  "#8b5cf6",
];

export default function FoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(FOLDER_COLORS[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchFolders();
  }, []);

  async function fetchFolders() {
    try {
      const res = await fetch("/api/folders");
      const data = await res.json();
      if (data.success) setFolders(data.data);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setShowCreate(true);
    setEditingId(null);
    setName("");
    setColor(FOLDER_COLORS[0]);
  }

  function openEdit(folder: Folder) {
    setShowCreate(true);
    setEditingId(folder.id);
    setName(folder.name);
    setColor(folder.color);
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(
        editingId ? `/api/folders/${editingId}` : "/api/folders",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color }),
        }
      );
      if (res.ok) {
        setShowCreate(false);
        fetchFolders();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bạn có chắc muốn xoá folder này?")) return;
    const res = await fetch(`/api/folders/${id}`, { method: "DELETE" });
    if (res.ok) setFolders((prev) => prev.filter((f) => f.id !== id));
  }

  if (loading) {
    return (
      <div className="max-w-5xl">
        <h1 className="text-4xl font-black text-[#3a3a5c] mb-6">Folders</h1>
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-[#7c5cbf] border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-4xl font-black text-[#3a3a5c]">Folders</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold rounded-lg transition-colors shadow-[0_4px_0_#5e3d9e]"
        >
          <Plus className="h-4 w-4" />
          New Folder
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreate && (
        <div className="bg-white rounded-2xl p-5 mb-6 shadow-[0_4px_0_#d1d5db] border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-[#3a3a5c] text-lg">
              {editingId ? "Edit Folder" : "New Folder"}
            </h2>
            <button
              onClick={() => setShowCreate(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Folder name"
              className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-[#4ecdc4] focus:outline-none text-[#3a3a5c] font-medium"
              autoFocus
            />
            <div>
              <label className="block text-sm font-bold text-gray-500 mb-2">
                Color
              </label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="w-8 h-8 rounded-full transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: color === c ? "3px solid #3a3a5c" : "none",
                      outlineOffset: "2px",
                    }}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-gray-300 text-white font-extrabold rounded-lg transition-colors shadow-[0_3px_0_#38a89d] disabled:shadow-[0_3px_0_#aaa]"
            >
              <Check className="h-4 w-4" />
              {editingId ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {folders.length === 0 && !showCreate ? (
        <div className="bg-[#e0e0e0] rounded-2xl border-2 border-[#ccc] p-10 text-center shadow-[0_4px_0_#bbb]">
          <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-[#3a3a5c] mb-3">
            No Folders Yet
          </h2>
          <p className="text-gray-500 font-medium mb-5">
            Create folders to organize your question sets
          </p>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold text-lg rounded-lg transition-colors shadow-[0_4px_0_#5e3d9e]"
          >
            <Plus className="h-5 w-5" />
            Create a Folder
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_0_#d1d5db] border border-gray-200 hover:shadow-[0_6px_0_#d1d5db] transition-shadow"
            >
              <div
                className="h-3 w-full"
                style={{ backgroundColor: folder.color }}
              />
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: folder.color + "20" }}
                    >
                      <FolderOpen
                        className="h-5 w-5"
                        style={{ color: folder.color }}
                      />
                    </div>
                    <div>
                      <h3 className="font-black text-[#3a3a5c]">
                        {folder.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {folder._count.questionSets} sets
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => openEdit(folder)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-bold text-sm rounded-lg transition-colors shadow-[0_3px_0_#38a89d]"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(folder.id)}
                    className="flex items-center justify-center p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors shadow-[0_3px_0_#b91c1c]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
