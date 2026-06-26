"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Sparkles,
  Trash2,
  Check,
  ChevronLeft,
  Quote,
  Loader2,
  Plus,
  AlertTriangle,
} from "lucide-react";

type Difficulty = "EASY" | "MEDIUM" | "HARD";

interface DraftAnswer {
  text: string;
  isCorrect: boolean;
}
interface DraftQuestion {
  text: string;
  answers: DraftAnswer[];
  difficulty: Difficulty;
  timeLimit: number;
  points: number;
  sourceQuote: string;
  chunkId: string;
  grounded?: boolean;
}

const ANSWER_COLORS = [
  { bg: "#f59e0b", shadow: "#d97706" },
  { bg: "#3b82f6", shadow: "#2563eb" },
  { bg: "#10b981", shadow: "#059669" },
  { bg: "#ef4444", shadow: "#dc2626" },
];

const DIFFICULTY_BADGE: Record<Difficulty, { label: string; cls: string }> = {
  EASY: { label: "Nhận biết", cls: "bg-emerald-100 text-emerald-700" },
  MEDIUM: { label: "Thông hiểu", cls: "bg-amber-100 text-amber-700" },
  HARD: { label: "Vận dụng", cls: "bg-red-100 text-red-700" },
};

export function AIGenerator() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [phase, setPhase] = useState<"config" | "review">("config");

  // config
  const [docs, setDocs] = useState<
    { id: string; filename: string; chunks: number }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  // Danh sách mọi tài liệu đã upload (để chọn "bản cũ" khi so sánh).
  const [allDocs, setAllDocs] = useState<{ id: string; filename: string }[]>([]);
  const [comparedToId, setComparedToId] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/documents");
        const data = await res.json();
        if (data.success) {
          setAllDocs(
            data.data.map((d: { id: string; filename: string }) => ({
              id: d.id,
              filename: d.filename,
            }))
          );
        }
      } catch {
        /* ignore */
      }
    })();
  }, [docs.length]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState("MIXED");
  const [domainHint, setDomainHint] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // review
  const [jobId, setJobId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [title, setTitle] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [publishing, setPublishing] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      // Tải từng file một (rồi gộp vào danh sách) để mỗi file là một tài liệu nguồn.
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.success) {
          setDocs((prev) => [
            ...prev,
            {
              id: data.data.id,
              filename: data.data.filename,
              chunks: data.data._count.chunks,
            },
          ]);
          toast.success(`Đã tải "${data.data.filename}" (${data.data._count.chunks} đoạn)`);
        } else {
          toast.error(`${file.name}: ${data.error?.message ?? "tải lên thất bại"}`);
        }
      }
    } catch {
      toast.error("Lỗi kết nối khi tải file");
    } finally {
      setUploading(false);
      // Cho phép chọn lại đúng file vừa tải.
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleGenerate() {
    if (docs.length === 0) return;
    setGenerating(true);
    setProgress(0);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentIds: docs.map((d) => d.id),
          comparedToDocumentId: comparedToId || undefined,
          config: { numQuestions, difficulty, domainHint: domainHint || undefined },
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error?.message ?? "Không khởi tạo được job");
        setGenerating(false);
        return;
      }
      pollJob(data.data.id);
    } catch {
      toast.error("Lỗi kết nối khi sinh đề");
      setGenerating(false);
    }
  }

  function pollJob(id: string) {
    const tick = async () => {
      try {
        const res = await fetch(`/api/generate/${id}`);
        const data = await res.json();
        if (!data.success) {
          toast.error("Không lấy được trạng thái job");
          setGenerating(false);
          return;
        }
        const job = data.data;
        setProgress(job.progress ?? 0);

        if (job.status === "REVIEW") {
          const draft = job.draft?.questions ?? [];
          setQuestions(draft);
          setJobId(job.id);
          setTitle(
            docs[0]?.filename.replace(/\.[^.]+$/, "") ?? "Bộ câu hỏi AI"
          );
          setPhase("review");
          setGenerating(false);
          toast.success(`Đã sinh ${draft.length} câu hỏi — hãy review trước khi lưu`);
          return;
        }
        if (job.status === "FAILED") {
          toast.error(job.error ?? "Sinh đề thất bại");
          setGenerating(false);
          return;
        }
        // PROCESSING → poll tiếp
        setTimeout(tick, 1500);
      } catch {
        setTimeout(tick, 2500);
      }
    };
    tick();
  }

  function updateQuestion(i: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function updateAnswer(qi: number, ai: number, patch: Partial<DraftAnswer>) {
    setQuestions((prev) =>
      prev.map((q, idx) => {
        if (idx !== qi) return q;
        const answers = q.answers.map((a, j) => {
          if (patch.isCorrect) {
            // single-correct: chọn đáp án đúng duy nhất
            return { ...a, isCorrect: j === ai };
          }
          return j === ai ? { ...a, ...patch } : a;
        });
        return { ...q, answers };
      })
    );
  }

  function deleteQuestion(i: number) {
    setQuestions((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addAnswer(qi: number) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi && q.answers.length < 4
          ? { ...q, answers: [...q.answers, { text: "", isCorrect: false }] }
          : q
      )
    );
  }

  function deleteAnswer(qi: number, ai: number) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi && q.answers.length > 2
          ? { ...q, answers: q.answers.filter((_, j) => j !== ai) }
          : q
      )
    );
  }

  function validateDraft(): string | null {
    if (!title.trim()) return "Nhập tiêu đề bộ câu hỏi";
    if (questions.length === 0) return "Cần tối thiểu 1 câu hỏi";
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) return `Câu ${i + 1}: thiếu nội dung`;
      const filled = q.answers.filter((a) => a.text.trim());
      if (filled.length < 2) return `Câu ${i + 1}: cần tối thiểu 2 đáp án`;
      if (q.answers.filter((a) => a.isCorrect).length !== 1)
        return `Câu ${i + 1}: phải có đúng 1 đáp án đúng`;
    }
    return null;
  }

  async function handlePublish() {
    if (!jobId) return;
    const err = validateDraft();
    if (err) {
      toast.error(err);
      return;
    }
    setPublishing(true);
    try {
      // 1) Lưu draft đã review
      const cleaned = questions.map((q) => ({
        ...q,
        answers: q.answers.filter((a) => a.text.trim()),
      }));
      const patchRes = await fetch(`/api/generate/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: cleaned }),
      });
      const patchData = await patchRes.json();
      if (!patchData.success) {
        toast.error(patchData.error?.message ?? "Lưu chỉnh sửa thất bại");
        return;
      }

      // 2) Duyệt → tạo QuestionSet
      const pubRes = await fetch(`/api/generate/${jobId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, isPublic }),
      });
      const pubData = await pubRes.json();
      if (pubData.success) {
        toast.success("Đã tạo bộ câu hỏi!");
        router.push("/dashboard/sets");
      } else {
        toast.error(pubData.error?.message ?? "Publish thất bại");
      }
    } catch {
      toast.error("Lỗi kết nối khi publish");
    } finally {
      setPublishing(false);
    }
  }

  // ── PHASE: CONFIG ─────────────────────────────────────────────
  if (phase === "config") {
    return (
      <div className="max-w-2xl">
        <h1 className="text-4xl font-black text-[#3a3a5c] mb-1 flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-[#7c5cbf]" />
          Sinh đề bằng AI
        </h1>
        <p className="text-gray-500 mb-6">
          Tải một hoặc nhiều tài liệu nghiệp vụ (.docx, .xlsx) — AI sẽ sinh câu
          hỏi từ toàn bộ tài liệu, bạn duyệt trước khi lưu.
        </p>

        <div className="bg-white/80 rounded-2xl p-6 shadow-sm space-y-5">
          {/* Upload */}
          <div>
            <label className="block text-sm font-black text-[#3a3a5c] mb-1.5">
              Tài liệu nguồn{docs.length > 0 ? ` (${docs.length})` : ""}
            </label>
            {docs.length > 0 && (
              <div className="space-y-2 mb-2">
                {docs.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#4ecdc4]/10 border-2 border-[#4ecdc4]"
                  >
                    <FileText className="h-5 w-5 text-[#38a89d] shrink-0" />
                    <span className="font-bold text-[#3a3a5c] flex-1 truncate">
                      {d.filename}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {d.chunks} đoạn
                    </span>
                    <button
                      onClick={() =>
                        setDocs((prev) => prev.filter((x) => x.id !== d.id))
                      }
                      className="text-sm font-bold text-gray-500 hover:text-red-500 shrink-0"
                    >
                      Bỏ
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#7c5cbf] transition-colors"
            >
              {uploading ? (
                <Loader2 className="h-7 w-7 text-[#7c5cbf] animate-spin" />
              ) : (
                <Upload className="h-7 w-7 text-gray-400" />
              )}
              <span className="font-bold text-[#3a3a5c]">
                {uploading
                  ? "Đang đọc tài liệu..."
                  : docs.length > 0
                    ? "Thêm tài liệu khác"
                    : "Chọn file .docx hoặc .xlsx"}
              </span>
              <span className="text-xs text-gray-400">
                Có thể chọn nhiều file · tối đa 10MB/file
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".docx,.xlsx"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* So sánh phiên bản: chỉ sinh từ phần mới */}
          {docs.length > 0 &&
            allDocs.some((d) => !docs.find((x) => x.id === d.id)) && (
              <div>
                <label className="block text-sm font-black text-[#3a3a5c] mb-1.5">
                  Chỉ sinh câu từ phần MỚI so với bản cũ (tùy chọn)
                </label>
                <select
                  value={comparedToId}
                  onChange={(e) => setComparedToId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-[#4ecdc4] focus:outline-none text-[#3a3a5c] font-medium bg-white"
                >
                  <option value="">— Không so sánh (sinh từ toàn bộ) —</option>
                  {allDocs
                    .filter((d) => !docs.find((x) => x.id === d.id))
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.filename}
                      </option>
                    ))}
                </select>
                {comparedToId && (
                  <p className="text-xs text-gray-400 mt-1">
                    Bỏ qua nội dung trùng bản cũ — chỉ sinh từ phần thêm/đã sửa.
                  </p>
                )}
              </div>
            )}

          {/* Số câu */}
          <div>
            <label className="block text-sm font-black text-[#3a3a5c] mb-1.5">
              Số câu hỏi: {numQuestions}
            </label>
            <input
              type="range"
              min={1}
              max={30}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value))}
              className="w-full accent-[#7c5cbf]"
            />
          </div>

          {/* Độ khó */}
          <div>
            <label className="block text-sm font-black text-[#3a3a5c] mb-1.5">
              Độ khó
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { v: "EASY", l: "Nhận biết" },
                { v: "MEDIUM", l: "Thông hiểu" },
                { v: "HARD", l: "Vận dụng" },
                { v: "MIXED", l: "Trộn" },
              ].map((d) => (
                <button
                  key={d.v}
                  onClick={() => setDifficulty(d.v)}
                  className={`py-2 rounded-lg font-bold text-sm transition-colors ${
                    difficulty === d.v
                      ? "bg-[#7c5cbf] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {d.l}
                </button>
              ))}
            </div>
          </div>

          {/* Bối cảnh */}
          <div>
            <label className="block text-sm font-black text-[#3a3a5c] mb-1.5">
              Bối cảnh nghiệp vụ (tùy chọn)
            </label>
            <textarea
              value={domainHint}
              onChange={(e) => setDomainHint(e.target.value)}
              placeholder="VD: Quy định cho vay tiêu dùng, đối tượng là nhân viên tín dụng..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border-2 border-[#4ecdc4] focus:outline-none text-[#3a3a5c] font-medium resize-none"
            />
          </div>

          {generating && (
            <div className="space-y-1.5">
              <div className="h-2.5 w-full bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#7c5cbf] transition-all duration-500"
                  style={{ width: `${Math.max(5, progress)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center font-medium">
                AI đang phân tích tài liệu & sinh câu hỏi... {progress}%
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={docs.length === 0 || generating}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#7c5cbf] hover:bg-[#6b4da8] disabled:bg-gray-300 text-white font-extrabold text-lg rounded-lg transition-colors shadow-[0_4px_0_#5e3d9e] disabled:shadow-[0_4px_0_#aaa]"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                AI đang sinh đề...
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Sinh đề
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── PHASE: REVIEW ─────────────────────────────────────────────
  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setPhase("config")}
          className="p-2 text-[#3a3a5c] hover:bg-white/50 rounded-lg"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-3xl font-black text-[#3a3a5c]">
          Review đề ({questions.length} câu)
        </h1>
      </div>

      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800 font-medium">
        ⚠️ Đề do AI sinh từ tài liệu. Vui lòng kiểm tra tính chính xác nghiệp vụ
        trước khi lưu. Mỗi câu có trích dẫn nguồn để đối chiếu.
      </div>

      {/* Tiêu đề + publish */}
      <div className="bg-white/80 rounded-2xl p-4 shadow-sm mb-4 space-y-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Tiêu đề bộ câu hỏi"
          className="w-full px-4 py-2.5 rounded-lg border-2 border-[#4ecdc4] focus:outline-none text-[#3a3a5c] font-bold"
        />
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsPublic(!isPublic)}
            className="flex items-center gap-2"
          >
            <div
              className={`w-11 h-6 rounded-full transition-colors relative ${isPublic ? "bg-[#4ecdc4]" : "bg-gray-300"}`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${isPublic ? "translate-x-[22px]" : "translate-x-0.5"}`}
              />
            </div>
            <span className="font-bold text-[#3a3a5c] text-sm">
              {isPublic ? "Công khai" : "Riêng tư"}
            </span>
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-gray-300 text-white font-extrabold rounded-lg transition-colors shadow-[0_3px_0_#38a89d] disabled:shadow-[0_3px_0_#aaa]"
          >
            {publishing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Duyệt & Lưu
          </button>
        </div>
      </div>

      {/* Danh sách câu hỏi */}
      <div className="space-y-4">
        {questions.map((q, qi) => (
          <div key={qi} className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-gray-400">
                  Câu {qi + 1}
                </span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${DIFFICULTY_BADGE[q.difficulty].cls}`}
                >
                  {DIFFICULTY_BADGE[q.difficulty].label}
                </span>
                <span className="text-xs text-gray-400">{q.points}đ · {q.timeLimit}s</span>
                {q.grounded === false && (
                  <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                    <AlertTriangle className="h-3 w-3" />
                    Cần đối chiếu nguồn
                  </span>
                )}
              </div>
              <button
                onClick={() => deleteQuestion(qi)}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <textarea
              value={q.text}
              onChange={(e) => updateQuestion(qi, { text: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-[#7c5cbf] focus:outline-none text-[#3a3a5c] font-bold resize-none mb-2"
            />

            {q.sourceQuote && (
              <div className="flex gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg p-2 mb-3 italic">
                <Quote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span className="line-clamp-3">{q.sourceQuote}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.answers.map((a, ai) => (
                <div
                  key={ai}
                  className="flex items-center gap-2 rounded-lg p-2"
                  style={{ backgroundColor: `${ANSWER_COLORS[ai % 4].bg}22` }}
                >
                  <button
                    onClick={() => updateAnswer(qi, ai, { isCorrect: true })}
                    title="Đánh dấu đáp án đúng"
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      a.isCorrect
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-gray-300"
                    }`}
                  >
                    {a.isCorrect && <Check className="h-4 w-4 text-white" />}
                  </button>
                  <input
                    type="text"
                    value={a.text}
                    onChange={(e) =>
                      updateAnswer(qi, ai, { text: e.target.value })
                    }
                    className="flex-1 bg-transparent text-[#3a3a5c] font-medium text-sm outline-none min-w-0"
                  />
                  {q.answers.length > 2 && (
                    <button
                      onClick={() => deleteAnswer(qi, ai)}
                      className="text-gray-300 hover:text-red-500 shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {q.answers.length < 4 && (
              <button
                onClick={() => addAnswer(qi)}
                className="mt-2 flex items-center gap-1 text-xs font-bold text-[#7c5cbf] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Thêm đáp án
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
