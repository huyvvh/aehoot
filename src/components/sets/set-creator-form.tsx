"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Plus,
  Trash2,
  X,
  Check,
  ChevronLeft,
  Clock,
  Upload,
  ImageIcon,
} from "lucide-react";
import { useRef } from "react";

interface Answer {
  text: string;
  isCorrect: boolean;
}

interface Question {
  text: string;
  imageUrl: string | null;
  timeLimit: number;
  points: number;
  answers: Answer[];
}

const ANSWER_COLORS = [
  { bg: "#f59e0b", shadow: "#d97706" },
  { bg: "#3b82f6", shadow: "#2563eb" },
  { bg: "#10b981", shadow: "#059669" },
  { bg: "#ef4444", shadow: "#dc2626" },
];

const DEFAULT_QUESTION: Question = {
  text: "",
  imageUrl: null,
  timeLimit: 20,
  points: 100,
  answers: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
};

export function SetCreatorForm({ editId }: { editId?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "questions">(
    editId ? "questions" : "info"
  );
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);
  const [uploadingCover, setUploadingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<Question>(DEFAULT_QUESTION);

  useEffect(() => {
    if (editId) loadSet();
  }, [editId]);

  async function loadSet() {
    try {
      const res = await fetch(`/api/sets/${editId}`);
      const data = await res.json();
      if (data.success) {
        const set = data.data;
        setTitle(set.title);
        setDescription(set.description || "");
        setIsPublic(set.isPublic);
        setCoverImage(set.coverImage);
        setFolderId(set.folderId);
        setQuestions(
          set.questions.map((q: any) => ({
            text: q.text,
            imageUrl: q.imageUrl,
            timeLimit: q.timeLimit,
            points: q.points,
            answers: q.answers.map((a: any) => ({
              text: a.text,
              isCorrect: a.isCorrect,
            })),
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCoverFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) setCoverImage(data.url);
    } finally {
      setUploadingCover(false);
    }
  }

  function handleCreateSet() {
    if (!title.trim()) return;
    setStep("questions");
  }

  function openAddQuestion() {
    setEditingQuestion(null);
    setCurrentQuestion({ ...DEFAULT_QUESTION, answers: DEFAULT_QUESTION.answers.map(a => ({...a})) });
  }

  function openEditQuestion(index: number) {
    setEditingQuestion(index);
    const q = questions[index];
    setCurrentQuestion({
      ...q,
      answers: q.answers.map((a) => ({ ...a })),
    });
  }

  function saveQuestion() {
    if (!currentQuestion.text.trim()) return;
    const hasCorrect = currentQuestion.answers.some((a) => a.isCorrect);
    const filledAnswers = currentQuestion.answers.filter(
      (a) => a.text.trim() !== ""
    );
    if (filledAnswers.length < 2 || !hasCorrect) return;

    const cleaned: Question = {
      ...currentQuestion,
      answers: filledAnswers,
    };

    if (editingQuestion !== null) {
      setQuestions((prev) =>
        prev.map((q, i) => (i === editingQuestion ? cleaned : q))
      );
    } else {
      setQuestions((prev) => [...prev, cleaned]);
    }
    setEditingQuestion(null);
    setCurrentQuestion(DEFAULT_QUESTION);
  }

  function deleteQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (questions.length === 0) return;
    setSaving(true);

    const payload = {
      title,
      description: description || undefined,
      coverImage,
      isPublic,
      folderId,
      questions: questions.map((q) => ({
        text: q.text,
        imageUrl: q.imageUrl,
        timeLimit: q.timeLimit,
        points: q.points,
        answers: q.answers.map((a) => ({
          text: a.text,
          isCorrect: a.isCorrect,
        })),
      })),
    };

    try {
      const res = await fetch(editId ? `/api/sets/${editId}` : "/api/sets", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/dashboard/sets");
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-4 border-[#7c5cbf] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Step 1: Set Info
  if (step === "info") {
    return (
      <div className="max-w-4xl">
        <h1 className="text-4xl font-black text-[#3a3a5c] mb-6">
          Question Set Creator
        </h1>
        <div className="bg-white/80 rounded-2xl p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-black text-[#3a3a5c] mb-1.5">
                  Title (required)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Add a descriptive title"
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#4ecdc4] focus:border-[#4ecdc4] focus:outline-none text-[#3a3a5c] font-medium"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[#3a3a5c] mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell users about your question set"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border-2 border-[#4ecdc4] focus:border-[#4ecdc4] focus:outline-none text-[#3a3a5c] font-medium resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-black text-[#3a3a5c] mb-1.5">
                  Privacy Setting
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  This decides who can find and play your question set
                </p>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className="flex items-center gap-3"
                >
                  <div
                    className={`w-12 h-6 rounded-full transition-colors relative ${isPublic ? "bg-[#4ecdc4]" : "bg-gray-300"}`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform shadow-sm ${isPublic ? "translate-x-6" : "translate-x-0.5"}`}
                    />
                  </div>
                  <span className="font-bold text-[#3a3a5c]">
                    {isPublic
                      ? "Public (Playable by everyone)"
                      : "Private (Only you)"}
                  </span>
                </button>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-xl overflow-hidden flex flex-col">
              <h3 className="font-black text-[#3a3a5c] text-sm px-4 pt-3 pb-2">
                Cover Image
              </h3>
              {coverImage ? (
                <div className="relative flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImage}
                    alt="Cover"
                    className="w-full h-36 object-cover"
                  />
                  <button
                    onClick={() => setCoverImage(null)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-colors"
                  >
                    <X className="h-4 w-4 text-white" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
                  <ImageIcon className="h-10 w-10 text-gray-300" />
                  <p className="text-xs text-gray-400 text-center">
                    Tải lên ảnh bìa (max 5MB)
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingCover}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7c5cbf] hover:bg-[#6b4da8] disabled:bg-gray-300 text-white text-sm font-bold rounded-lg transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    {uploadingCover ? "Đang tải..." : "Chọn ảnh"}
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleCoverFileChange}
              />
            </div>
          </div>

          <button
            onClick={handleCreateSet}
            disabled={!title.trim()}
            className="mt-6 px-8 py-3.5 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-gray-300 text-white font-extrabold text-lg rounded-lg transition-colors shadow-[0_4px_0_#38a89d] disabled:shadow-[0_4px_0_#aaa]"
          >
            {editId ? "Continue" : "Create Set"}
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Questions Editor
  const isQuestionEditorOpen = editingQuestion !== null || currentQuestion.text !== DEFAULT_QUESTION.text;

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setStep("info")}
            className="p-2 text-[#3a3a5c] hover:bg-white/50 rounded-lg"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-3xl font-black text-[#3a3a5c]">{title}</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="bg-white px-4 py-2 rounded-lg font-bold text-[#3a3a5c] shadow-sm">
            {questions.length} Questions
          </span>
          <button
            onClick={openAddQuestion}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold rounded-lg transition-colors shadow-[0_4px_0_#5e3d9e]"
          >
            <Plus className="h-5 w-5" />
            Add Question
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Left: Set card + question list */}
        <div className="space-y-3">
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_0_#d1d5db]">
            <div className="h-28 bg-[#4ecdc4] flex items-center justify-center">
              <span className="text-white/60 text-3xl font-black italic">
                AEHoot
              </span>
            </div>
            <div className="p-3">
              <h3 className="font-black text-[#3a3a5c] truncate">{title}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isPublic ? "Public" : "Private"}
              </p>
            </div>
            <div className="px-3 pb-3 space-y-2">
              <button
                onClick={handleSave}
                disabled={saving || questions.length === 0}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-gray-300 text-white font-extrabold rounded-lg transition-colors shadow-[0_3px_0_#38a89d] disabled:shadow-[0_3px_0_#aaa]"
              >
                <Save className="h-4 w-4" />
                Save Set
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setStep("info")}
                  className="flex-1 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-sm rounded-lg transition-colors"
                >
                  Edit Info
                </button>
              </div>
            </div>
          </div>

          {/* Question list */}
          {questions.map((q, i) => (
            <div
              key={i}
              onClick={() => openEditQuestion(i)}
              className="bg-white rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-400">
                    Question {i + 1}
                  </p>
                  <p className="text-sm font-bold text-[#3a3a5c] truncate">
                    {q.text || "Untitled"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {q.answers.filter((a) => a.text).length} answers
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteQuestion(i);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {/* Add Question bottom buttons */}
          <div className="flex gap-2">
            <button
              onClick={openAddQuestion}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-bold rounded-lg transition-colors shadow-[0_3px_0_#5e3d9e]"
            >
              <Plus className="h-4 w-4" />
              Add Question
            </button>
          </div>
        </div>

        {/* Right: Question Editor */}
        <QuestionEditor
          question={currentQuestion}
          onChange={setCurrentQuestion}
          onSave={saveQuestion}
          onCancel={() => {
            setEditingQuestion(null);
            setCurrentQuestion({ ...DEFAULT_QUESTION, answers: DEFAULT_QUESTION.answers.map(a => ({...a})) });
          }}
          isEditing={editingQuestion !== null}
        />
      </div>
    </div>
  );
}

function QuestionEditor({
  question,
  onChange,
  onSave,
  onCancel,
  isEditing,
}: {
  question: Question;
  onChange: (q: Question) => void;
  onSave: () => void;
  onCancel: () => void;
  isEditing: boolean;
}) {
  const ANSWER_COLORS = [
    { bg: "#f59e0b", shadow: "#d97706", label: "Answer 1" },
    { bg: "#3b82f6", shadow: "#2563eb", label: "Answer 2" },
    { bg: "#10b981", shadow: "#059669", label: "Answer 3 (Optional)" },
    { bg: "#ef4444", shadow: "#dc2626", label: "Answer 4 (Optional)" },
  ];

  function updateAnswer(index: number, field: keyof Answer, value: any) {
    const newAnswers = question.answers.map((a, i) =>
      i === index ? { ...a, [field]: value } : field === "isCorrect" && value ? { ...a, isCorrect: false } : a
    );
    if (field === "isCorrect" && value) {
      newAnswers[index].isCorrect = true;
    }
    onChange({ ...question, answers: newAnswers });
  }

  return (
    <div className="bg-[#7c5cbf] rounded-2xl overflow-hidden shadow-lg">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/20 rounded-lg px-3 py-1.5">
            <Clock className="h-4 w-4 text-white" />
            <span className="text-white font-bold text-sm">Time Limit</span>
            <select
              value={question.timeLimit}
              onChange={(e) =>
                onChange({
                  ...question,
                  timeLimit: Number(e.target.value),
                })
              }
              className="bg-white text-[#3a3a5c] font-bold text-sm rounded px-2 py-0.5"
            >
              {[5, 10, 15, 20, 30, 45, 60, 90, 120].map((t) => (
                <option key={t} value={t}>
                  {t}s
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#3a3a5c] font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-white text-[#7c5cbf] font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>

      {/* Question text */}
      <div className="px-4 pb-4">
        <textarea
          value={question.text}
          onChange={(e) => onChange({ ...question, text: e.target.value })}
          placeholder="Question Text"
          rows={3}
          className="w-full px-4 py-4 rounded-lg border-2 border-[#4ecdc4] focus:border-[#4ecdc4] focus:outline-none text-[#3a3a5c] font-medium text-lg text-center resize-none bg-white"
        />

        {/* Answers grid */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {question.answers.map((answer, i) => (
            <div
              key={i}
              className="relative rounded-xl overflow-hidden transition-all"
              style={{
                backgroundColor: ANSWER_COLORS[i].bg,
                boxShadow: `0 4px 0 ${ANSWER_COLORS[i].shadow}`,
              }}
            >
              <div className="flex items-center gap-3 p-4">
                <button
                  onClick={() => updateAnswer(i, "isCorrect", !answer.isCorrect)}
                  className={`w-8 h-8 rounded border-2 border-white/60 flex items-center justify-center shrink-0 transition-colors ${
                    answer.isCorrect ? "bg-white" : "bg-white/20"
                  }`}
                >
                  {answer.isCorrect && (
                    <Check
                      className="h-5 w-5"
                      style={{ color: ANSWER_COLORS[i].bg }}
                    />
                  )}
                </button>
                <input
                  type="text"
                  value={answer.text}
                  onChange={(e) => updateAnswer(i, "text", e.target.value)}
                  placeholder={ANSWER_COLORS[i].label}
                  className="flex-1 bg-transparent text-white placeholder:text-white/50 font-bold text-center outline-none"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
