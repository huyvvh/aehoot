"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Check,
  ChevronLeft,
  Quote,
  AlertTriangle,
} from "lucide-react";

type ExplStatus = "DRAFT" | "NEEDS_REVIEW" | "CURRENT" | "STALE";

interface ExplanationData {
  body: string;
  status: ExplStatus;
  grounded: boolean;
  citations: { quote: string }[];
}

interface ReviewQuestion {
  id: string;
  text: string;
  answers: { text: string; isCorrect: boolean }[];
  explanation: ExplanationData | null;
}

const ANSWER_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444"];

export function ExplanationReviewer({
  questionSetId,
  setTitle,
}: {
  questionSetId: string;
  setTitle?: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "generating" | "review" | "done">(
    "idle"
  );
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ReviewQuestion[]>([]);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{
    total: number;
    withExplanation: number;
    CURRENT: number;
    STALE: number;
    NEEDS_REVIEW: number;
    DRAFT: number;
  } | null>(null);

  // Khôi phục job đang chờ duyệt + tải tóm tắt trạng thái khi mở trang.
  useEffect(() => {
    (async () => {
      try {
        const statusRes = await fetch(
          `/api/explanations/status?questionSetId=${questionSetId}`
        );
        const statusData = await statusRes.json();
        if (statusData.success) setSummary(statusData.data);

        const res = await fetch("/api/explanations");
        const data = await res.json();
        if (!data.success) return;
        const job = data.data.find(
          (j: { questionSet?: { id: string }; status: string; id: string }) =>
            j.questionSet?.id === questionSetId && j.status === "REVIEW"
        );
        if (job) await loadJob(job.id);
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questionSetId]);

  async function loadJob(id: string): Promise<boolean> {
    const res = await fetch(`/api/explanations/${id}`);
    const data = await res.json();
    if (!data.success) return false;
    setQuestions(data.data.questions as ReviewQuestion[]);
    setJobId(id);
    setPhase("review");
    return true;
  }

  async function handleGenerate() {
    setPhase("generating");
    setProgress(0);
    try {
      const res = await fetch("/api/explanations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionSetId }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error?.message ?? "Không khởi tạo được job");
        setPhase("idle");
        return;
      }
      pollJob(data.data.id);
    } catch {
      toast.error("Lỗi kết nối khi sinh giải thích");
      setPhase("idle");
    }
  }

  function pollJob(id: string) {
    const tick = async () => {
      try {
        const res = await fetch(`/api/explanations/${id}`);
        const data = await res.json();
        if (!data.success) {
          setTimeout(tick, 2500);
          return;
        }
        const job = data.data.job;
        setProgress(job.progress ?? 0);

        if (job.status === "REVIEW") {
          setQuestions(data.data.questions as ReviewQuestion[]);
          setJobId(id);
          setPhase("review");
          toast.success("Đã sinh giải thích — hãy review trước khi áp dụng");
          return;
        }
        if (job.status === "FAILED") {
          toast.error(job.error ?? "Sinh giải thích thất bại");
          setPhase("idle");
          return;
        }
        setTimeout(tick, 1500);
      } catch {
        setTimeout(tick, 2500);
      }
    };
    tick();
  }

  function updateBody(i: number, body: string) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === i && q.explanation
          ? { ...q, explanation: { ...q.explanation, body } }
          : q
      )
    );
  }

  async function saveEdits(): Promise<boolean> {
    if (!jobId) return false;
    const payload = questions
      .filter((q) => q.explanation && q.explanation.body.trim())
      .map((q) => ({ questionId: q.id, body: q.explanation!.body }));
    if (payload.length === 0) return true;
    const res = await fetch(`/api/explanations/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ explanations: payload }),
    });
    const data = await res.json();
    if (!data.success) {
      toast.error(data.error?.message ?? "Lưu chỉnh sửa thất bại");
      return false;
    }
    return true;
  }

  async function handleSave() {
    setBusy(true);
    try {
      if (await saveEdits()) toast.success("Đã lưu chỉnh sửa");
    } finally {
      setBusy(false);
    }
  }

  async function handleApprove() {
    if (!jobId) return;
    setBusy(true);
    try {
      // Lưu nội dung đang sửa trước khi duyệt.
      if (!(await saveEdits())) return;
      const res = await fetch(`/api/explanations/${jobId}/approve`, {
        method: "POST",
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error?.message ?? "Duyệt thất bại");
        return;
      }
      setPhase("done");
      toast.success("Đã áp dụng giải thích — sẽ hiện trong game");
    } finally {
      setBusy(false);
    }
  }

  // ── IDLE ────────────────────────────────────────────────────
  if (phase === "idle") {
    const hasExisting = (summary?.withExplanation ?? 0) > 0;
    const staleCount = summary?.STALE ?? 0;
    return (
      <Shell onBack={() => router.back()} title={setTitle}>
        {staleCount > 0 && (
          <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 p-3.5">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
            <p className="text-sm text-amber-800 font-medium">
              <span className="font-black">{staleCount} câu</span> có giải thích
              đã lỗi thời do tài liệu nguồn bị thay thế. Hãy sinh lại để cập nhật
              theo quy định hiện hành — giải thích lỗi thời đã tạm ẩn khỏi game.
            </p>
          </div>
        )}
        <div className="bg-white rounded-2xl p-8 text-center shadow-[0_3px_0_#d1d5db] border border-gray-200">
          <div className="w-16 h-16 rounded-full bg-[#f3eefe] flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-[#7c5cbf]" />
          </div>
          <h2 className="text-xl font-black text-[#3a3a5c] mb-2">
            {hasExisting
              ? "Sinh lại giải thích đáp án"
              : "Sinh giải thích đáp án bằng AI"}
          </h2>
          <p className="text-gray-500 text-sm mb-4 max-w-md mx-auto">
            AI sẽ giải thích vì sao mỗi đáp án đúng, có trích dẫn nguồn từ tài
            liệu. Bạn phải review &amp; duyệt trước khi giải thích hiện trong
            game.
          </p>
          {summary && hasExisting && (
            <p className="text-xs text-gray-400 mb-6">
              {summary.CURRENT} đang hiệu lực · {summary.STALE} lỗi thời ·{" "}
              {summary.NEEDS_REVIEW + summary.DRAFT} chờ duyệt /{" "}
              {summary.total} câu
            </p>
          )}
          <button
            onClick={handleGenerate}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold rounded-xl transition-colors shadow-[0_3px_0_#5e3d9e]"
          >
            <Sparkles className="h-5 w-5" />
            {hasExisting ? "Sinh lại" : "Sinh giải thích"}
          </button>
        </div>
      </Shell>
    );
  }

  // ── GENERATING ──────────────────────────────────────────────
  if (phase === "generating") {
    return (
      <Shell onBack={() => router.back()} title={setTitle}>
        <div className="bg-white rounded-2xl p-10 text-center shadow-[0_3px_0_#d1d5db] border border-gray-200">
          <Loader2 className="h-10 w-10 text-[#7c5cbf] animate-spin mx-auto mb-4" />
          <p className="font-black text-[#3a3a5c] mb-3">Đang sinh giải thích…</p>
          <div className="w-full max-w-sm mx-auto bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full bg-[#7c5cbf] transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-gray-400 text-sm mt-2">{progress}%</p>
        </div>
      </Shell>
    );
  }

  // ── DONE ────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <Shell onBack={() => router.back()} title={setTitle}>
        <div className="bg-white rounded-2xl p-10 text-center shadow-[0_3px_0_#d1d5db] border border-gray-200">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-emerald-600" strokeWidth={3} />
          </div>
          <h2 className="text-xl font-black text-[#3a3a5c] mb-2">
            Đã áp dụng giải thích
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            Giải thích sẽ hiện cho người chơi sau khi lộ đáp án.
          </p>
          <button
            onClick={() => router.push(`/dashboard/sets/${questionSetId}`)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-extrabold rounded-xl transition-colors shadow-[0_3px_0_#38a89d]"
          >
            Về bộ đề
          </button>
        </div>
      </Shell>
    );
  }

  // ── REVIEW ──────────────────────────────────────────────────
  const withExpl = questions.filter((q) => q.explanation);
  const needReview = withExpl.filter(
    (q) => q.explanation!.status === "NEEDS_REVIEW" || !q.explanation!.grounded
  ).length;

  return (
    <Shell onBack={() => router.back()} title={setTitle}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <p className="font-black text-[#3a3a5c]">
            Review giải thích ({withExpl.length} câu)
          </p>
          {needReview > 0 && (
            <p className="text-amber-600 text-xs font-bold flex items-center gap-1 mt-0.5">
              <AlertTriangle className="h-3.5 w-3.5" />
              {needReview} câu cần soát kỹ (thiếu nguồn / chưa khớp tài liệu)
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={busy}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm rounded-xl transition-colors shadow-[0_3px_0_#d1d5db] disabled:opacity-50"
          >
            Lưu nháp
          </button>
          <button
            onClick={handleApprove}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold text-sm rounded-xl transition-colors shadow-[0_3px_0_#5e3d9e] disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Duyệt &amp; áp dụng
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {questions.map((q, qi) => (
          <div
            key={q.id}
            className="bg-white rounded-2xl p-5 shadow-[0_3px_0_#d1d5db] border border-gray-200"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="shrink-0 w-8 h-8 rounded-full bg-[#7c5cbf] text-white text-sm font-black flex items-center justify-center">
                {qi + 1}
              </span>
              <p className="flex-1 font-bold text-[#3a3a5c]">{q.text}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {q.answers.map((a, ai) => (
                <div
                  key={ai}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-white font-bold text-sm"
                  style={{
                    backgroundColor: ANSWER_COLORS[ai % 4],
                    opacity: a.isCorrect ? 1 : 0.55,
                  }}
                >
                  <span className="flex-1 truncate">{a.text}</span>
                  {a.isCorrect && <Check className="h-4 w-4 shrink-0" />}
                </div>
              ))}
            </div>

            {q.explanation ? (
              <>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-black text-gray-500">
                    Giải thích
                  </span>
                  {q.explanation.grounded ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      Có nguồn
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      Cần đối chiếu nguồn
                    </span>
                  )}
                </div>
                <textarea
                  value={q.explanation.body}
                  onChange={(e) => updateBody(qi, e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-gray-200 p-3 text-sm text-[#3a3a5c] focus:border-[#7c5cbf] focus:outline-none resize-y"
                />
                {q.explanation.citations.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {q.explanation.citations.map((c, ci) => (
                      <p
                        key={ci}
                        className="flex gap-1.5 text-xs text-gray-500 italic"
                      >
                        <Quote className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
                        <span className="line-clamp-3">{c.quote}</span>
                      </p>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Chưa sinh được giải thích cho câu này.
              </p>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
}

function Shell({
  children,
  onBack,
  title,
}: {
  children: React.ReactNode;
  onBack: () => void;
  title?: string;
}) {
  return (
    <div className="max-w-4xl">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-bold text-gray-500 hover:text-[#3a3a5c] mb-4 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Quay lại
      </button>
      <h1 className="text-2xl font-black text-[#3a3a5c] mb-1">
        Giải thích đáp án bằng AI
      </h1>
      {title && <p className="text-gray-500 text-sm mb-5">{title}</p>}
      {children}
    </div>
  );
}
