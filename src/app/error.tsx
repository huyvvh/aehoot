"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(135deg, #89d4e0 0%, #b8e4ec 100%)" }}
    >
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M18 0h4v18h18v4H22v18h-4V22H0v-4h18V0z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 text-center">
        <div className="mb-6">
          <Link href="/">
            <span className="text-4xl font-black italic text-[#3a3a5c]">AEHoot</span>
          </Link>
        </div>

        <div className="bg-white rounded-3xl px-10 py-12 shadow-[0_8px_0_rgba(0,0,0,0.1)] max-w-md w-full">
          <div className="text-6xl mb-4">😵</div>
          <div className="text-xl font-black text-[#3a3a5c] mb-2">Có lỗi xảy ra</div>
          <p className="text-gray-400 font-medium mb-8">
            Đã xảy ra lỗi không mong muốn. Hãy thử tải lại trang hoặc quay về trang chủ.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#8b5dc8] hover:bg-[#7a4db5] text-white font-extrabold rounded-xl transition-colors shadow-[0_4px_0_#6b3da8]"
            >
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-extrabold rounded-xl transition-colors shadow-[0_4px_0_#38a89d]"
            >
              <Home className="h-4 w-4" />
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
