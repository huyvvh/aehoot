"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function JoinGamePage() {
  const [gameCode, setGameCode] = useState("");
  const router = useRouter();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = gameCode.trim();
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      toast.error("Game ID phải là 6 chữ số");
      return;
    }
    router.push(`/play/${code}`);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative"
      style={{ background: "linear-gradient(135deg, #8b5dc8, #a855f7)" }}
    >
      <div className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M18 0h4v18h18v4H22v18h-4V22H0v-4h18V0z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
        }}
      />
      <Link href="/" className="mb-10 relative z-10">
        <h1 className="text-6xl font-black italic text-white drop-shadow-lg">AEHoot</h1>
      </Link>

      <form onSubmit={handleJoin} className="w-full max-w-sm relative z-10">
        <div className="flex gap-3">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="Game ID"
            value={gameCode}
            onChange={(e) => setGameCode(e.target.value.replace(/\D/g, ""))}
            className="h-16 text-center text-2xl font-black tracking-widest bg-white border-0 rounded-xl shadow-xl"
          />
          <button
            type="submit"
            className="h-16 w-16 shrink-0 bg-[#4ecdc4] hover:bg-[#45b7af] rounded-xl shadow-[0_5px_0_#38a89d] active:shadow-[0_2px_0_#38a89d] active:translate-y-[3px] transition-all flex items-center justify-center"
          >
            <ArrowRight className="h-7 w-7 text-white" />
          </button>
        </div>
      </form>

      <Link
        href="/login"
        className="mt-8 text-white/70 hover:text-white text-sm font-bold hover:underline relative z-10"
      >
        Đăng nhập để tạo game
      </Link>
    </div>
  );
}
