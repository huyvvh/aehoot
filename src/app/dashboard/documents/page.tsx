"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Loader2,
  Check,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  GitCompare,
} from "lucide-react";

interface DiffData {
  summary: { added: number; removed: number; changed: number; unchanged: number };
  diff: {
    added: string[];
    removed: string[];
    changed: { old: string; new: string }[];
  };
}

interface DocItem {
  id: string;
  filename: string;
  status: string;
  createdAt: string;
  regulationCode: string | null;
  effectiveDate: string | null;
  regStatus: "EFFECTIVE" | "SUPERSEDED";
  supersededById: string | null;
  _count: { chunks: number };
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  // edits[id] = { regulationCode, effectiveDate (yyyy-mm-dd) }
  const [edits, setEdits] = useState<
    Record<string, { regulationCode: string; effectiveDate: string }>
  >({});
  const [supersedeTarget, setSupersedeTarget] = useState<Record<string, string>>(
    {}
  );
  const [maintaining, setMaintaining] = useState(false);
  const [diff, setDiff] = useState<Record<string, DiffData>>({});
  const [diffLoadingId, setDiffLoadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocs();
  }, []);

  async function fetchDocs() {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      if (data.success) {
        setDocs(data.data);
        const init: Record<string, { regulationCode: string; effectiveDate: string }> = {};
        for (const d of data.data as DocItem[]) {
          init[d.id] = {
            regulationCode: d.regulationCode ?? "",
            effectiveDate: d.effectiveDate ? d.effectiveDate.slice(0, 10) : "",
          };
        }
        setEdits(init);
      }
    } finally {
      setLoading(false);
    }
  }

  async function saveMeta(id: string) {
    setSavingId(id);
    try {
      const e = edits[id];
      const res = await fetch(`/api/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regulationCode: e.regulationCode || null,
          effectiveDate: e.effectiveDate
            ? new Date(e.effectiveDate).toISOString()
            : null,
        }),
      });
      const data = await res.json();
      if (data.success) toast.success("Đã lưu thông tin văn bản");
      else toast.error(data.error?.message ?? "Lưu thất bại");
    } finally {
      setSavingId(null);
    }
  }

  async function supersede(id: string) {
    const target = supersedeTarget[id];
    if (!target) {
      toast.error("Chọn tài liệu thay thế");
      return;
    }
    setSavingId(id);
    try {
      const res = await fetch(`/api/documents/${id}/supersede`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supersededById: target }),
      });
      const data = await res.json();
      if (data.success) {
        const { staledCount, flaggedQuestions } = data.data;
        toast.success(
          `Đã đánh dấu thay thế. ${staledCount} giải thích & ${flaggedQuestions} câu hỏi cần rà soát.`
        );
        fetchDocs();
      } else {
        toast.error(data.error?.message ?? "Thao tác thất bại");
      }
    } finally {
      setSavingId(null);
    }
  }

  async function loadDiff(oldId: string) {
    const newId = supersedeTarget[oldId];
    if (!newId) {
      toast.error("Chọn tài liệu (bản mới) để so sánh");
      return;
    }
    setDiffLoadingId(oldId);
    try {
      const res = await fetch(
        `/api/documents/diff?oldId=${oldId}&newId=${newId}`
      );
      const data = await res.json();
      if (data.success) {
        setDiff((prev) => ({ ...prev, [oldId]: data.data }));
      } else {
        toast.error(data.error?.message ?? "So sánh thất bại");
      }
    } finally {
      setDiffLoadingId(null);
    }
  }

  async function runMaintenance() {
    setMaintaining(true);
    try {
      const res = await fetch("/api/explanations/maintenance", {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error?.message ?? "Cập nhật thất bại");
        return;
      }
      const { regenerated, sets } = data.data;
      if (regenerated === 0) {
        toast.success("Không có giải thích lỗi thời nào cần cập nhật");
      } else {
        toast.success(
          `Đã sinh lại ${regenerated} giải thích ở ${sets} bộ đề — vào bộ đề để duyệt`
        );
      }
    } finally {
      setMaintaining(false);
    }
  }

  const nameById = (id: string | null) =>
    docs.find((d) => d.id === id)?.filename ?? "—";

  if (loading) {
    return (
      <div className="max-w-4xl flex justify-center py-20">
        <Loader2 className="w-10 h-10 text-[#7c5cbf] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-black text-[#3a3a5c] mb-1">
            Tài liệu nguồn
          </h1>
          <p className="text-gray-500 text-sm max-w-2xl">
            Gắn mã văn bản &amp; ngày hiệu lực. Khi một quy định bị thay thế, các
            giải thích dựa trên nó sẽ tự được đánh dấu lỗi thời và tạm ẩn khỏi
            game.
          </p>
        </div>
        <button
          onClick={runMaintenance}
          disabled={maintaining}
          title="Sinh lại các giải thích lỗi thời theo tài liệu hiện hành"
          className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-bold text-sm rounded-xl transition-colors shadow-[0_3px_0_#5e3d9e] disabled:opacity-50"
        >
          {maintaining ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Cập nhật giải thích lỗi thời
        </button>
      </div>

      {docs.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center shadow-[0_3px_0_#d1d5db] border border-gray-200">
          <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-bold">Chưa có tài liệu nào</p>
          <p className="text-gray-400 text-sm mt-1">
            Tải tài liệu lên khi sinh đề bằng AI.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((d) => {
            const superseded = d.regStatus === "SUPERSEDED";
            const others = docs.filter(
              (o) => o.id !== d.id && o.regStatus === "EFFECTIVE"
            );
            return (
              <div
                key={d.id}
                className="bg-white rounded-2xl p-5 shadow-[0_3px_0_#d1d5db] border border-gray-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText className="h-5 w-5 shrink-0 text-[#7c5cbf] mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-bold text-[#3a3a5c] truncate">
                        {d.filename}
                      </p>
                      <p className="text-xs text-gray-400">
                        {d._count.chunks} đoạn
                      </p>
                    </div>
                  </div>
                  {superseded ? (
                    <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-gray-200 text-gray-600">
                      Đã thay thế
                    </span>
                  ) : (
                    <span className="shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                      Hiệu lực
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Mã văn bản
                    </label>
                    <input
                      value={edits[d.id]?.regulationCode ?? ""}
                      onChange={(ev) =>
                        setEdits((p) => ({
                          ...p,
                          [d.id]: { ...p[d.id], regulationCode: ev.target.value },
                        }))
                      }
                      placeholder="VD: Thông tư 39/2016/TT-NHNN"
                      disabled={superseded}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#7c5cbf] focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Ngày hiệu lực
                    </label>
                    <input
                      type="date"
                      value={edits[d.id]?.effectiveDate ?? ""}
                      onChange={(ev) =>
                        setEdits((p) => ({
                          ...p,
                          [d.id]: { ...p[d.id], effectiveDate: ev.target.value },
                        }))
                      }
                      disabled={superseded}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#7c5cbf] focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    />
                  </div>
                </div>

                {superseded ? (
                  <p className="flex items-center gap-1.5 text-sm text-gray-500">
                    <ArrowRight className="h-4 w-4" />
                    Thay thế bởi:{" "}
                    <span className="font-bold">
                      {nameById(d.supersededById)}
                    </span>
                  </p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={() => saveMeta(d.id)}
                      disabled={savingId === d.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-bold text-sm rounded-xl transition-colors shadow-[0_3px_0_#38a89d] disabled:opacity-50"
                    >
                      {savingId === d.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Lưu
                    </button>

                    {others.length > 0 && (
                      <div className="flex items-center gap-2 ml-auto">
                        <select
                          value={supersedeTarget[d.id] ?? ""}
                          onChange={(ev) =>
                            setSupersedeTarget((p) => ({
                              ...p,
                              [d.id]: ev.target.value,
                            }))
                          }
                          className="rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-[#7c5cbf] focus:outline-none max-w-[180px]"
                        >
                          <option value="">— thay thế bởi —</option>
                          {others.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.filename}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => loadDiff(d.id)}
                          disabled={diffLoadingId === d.id || !supersedeTarget[d.id]}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
                        >
                          {diffLoadingId === d.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <GitCompare className="h-4 w-4" />
                          )}
                          So sánh
                        </button>
                        <button
                          onClick={() => supersede(d.id)}
                          disabled={savingId === d.id}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold text-sm rounded-xl transition-colors disabled:opacity-50"
                        >
                          <AlertTriangle className="h-4 w-4" />
                          Đánh dấu thay thế
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {diff[d.id] && <DiffPanel data={diff[d.id]} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DiffPanel({ data }: { data: DiffData }) {
  const { summary, diff } = data;
  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <div className="flex flex-wrap gap-2 mb-3 text-xs font-bold">
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
          +{summary.added} mới
        </span>
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
          {summary.changed} đã sửa
        </span>
        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          −{summary.removed} đã xóa
        </span>
        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
          {summary.unchanged} giữ nguyên
        </span>
      </div>

      {diff.added.length > 0 && (
        <DiffList
          title="Mới"
          cls="text-emerald-700 border-emerald-300"
          items={diff.added}
        />
      )}
      {diff.changed.length > 0 && (
        <div className="mb-2">
          <p className="text-xs font-bold text-amber-700 mb-1">Đã sửa</p>
          <div className="space-y-1.5">
            {diff.changed.slice(0, 15).map((c, i) => (
              <div key={i} className="text-xs border-l-2 border-amber-300 pl-2">
                <p className="text-gray-400 line-through line-clamp-2">{c.old}</p>
                <p className="text-[#3a3a5c] line-clamp-2">{c.new}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {diff.removed.length > 0 && (
        <DiffList
          title="Đã xóa"
          cls="text-red-700 border-red-300"
          items={diff.removed}
        />
      )}
    </div>
  );
}

function DiffList({
  title,
  cls,
  items,
}: {
  title: string;
  cls: string;
  items: string[];
}) {
  return (
    <div className="mb-2">
      <p className={`text-xs font-bold mb-1 ${cls.split(" ")[0]}`}>{title}</p>
      <div className="space-y-1">
        {items.slice(0, 15).map((s, i) => (
          <p
            key={i}
            className={`text-xs text-gray-600 border-l-2 pl-2 line-clamp-2 ${cls.split(" ")[1]}`}
          >
            {s}
          </p>
        ))}
        {items.length > 15 && (
          <p className="text-xs text-gray-400">… và {items.length - 15} câu nữa</p>
        )}
      </div>
    </div>
  );
}
