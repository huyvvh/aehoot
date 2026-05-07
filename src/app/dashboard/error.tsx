"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

export default function DashboardError({
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
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="text-5xl mb-4">😵</div>
      <h2 className="text-xl font-black text-[#3a3a5c] mb-2">Có lỗi xảy ra</h2>
      <p className="text-gray-400 font-medium mb-6 max-w-xs">
        Không thể tải nội dung. Hãy thử tải lại.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7c5cbf] hover:bg-[#6b4da8] text-white font-extrabold rounded-xl transition-colors shadow-[0_4px_0_#5e3d9e]"
      >
        <RefreshCw className="h-4 w-4" />
        Thử lại
      </button>
    </div>
  );
}
