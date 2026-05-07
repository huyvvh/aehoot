"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/stores/auth-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function RegisterForm() {
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    displayName: "",
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error.message);
        return;
      }

      setAuth(data.data.user, data.data.token);
      toast.success("Đăng ký thành công!");
      router.push("/dashboard");
    } catch {
      toast.error("Đã xảy ra lỗi, vui lòng thử lại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-[#89d4e0] relative">
      <div className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M18 0h4v18h18v4H22v18h-4V22H0v-4h18V0z' fill='%23ffffff' fill-opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "40px 40px",
        }}
      />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <Link href="/">
            <h1 className="text-5xl font-black italic text-[#8b5dc8] drop-shadow-md">AEHoot</h1>
          </Link>
        </div>
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-extrabold text-[#3a3a5c] text-center mb-6">Đăng ký tài khoản</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-sm font-bold text-[#3a3a5c]">Tên hiển thị</Label>
              <Input
                id="displayName"
                placeholder="Nguyễn Văn A"
                value={form.displayName}
                onChange={(e) => update("displayName", e.target.value)}
                required
                className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#4ecdc4] font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-bold text-[#3a3a5c]">Username</Label>
              <Input
                id="username"
                placeholder="nguyenvana"
                value={form.username}
                onChange={(e) => update("username", e.target.value)}
                required
                className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#4ecdc4] font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-bold text-[#3a3a5c]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                required
                className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#4ecdc4] font-semibold"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-bold text-[#3a3a5c]">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="Tối thiểu 8 ký tự"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                required
                minLength={8}
                className="h-12 rounded-xl border-2 border-gray-200 focus:border-[#4ecdc4] font-semibold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:opacity-50 text-white font-extrabold text-base rounded-xl transition-colors shadow-[0_4px_0_#38a89d] active:shadow-[0_2px_0_#38a89d] active:translate-y-[2px] flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Đăng ký
            </button>
          </form>
          <p className="text-sm text-[#3a3a5c]/60 text-center mt-5 font-semibold">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-[#8b5dc8] hover:underline font-bold">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
