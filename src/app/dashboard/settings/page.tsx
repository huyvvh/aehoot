"use client";

import { useState } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { getRandomAvatar, AVATARS } from "@/lib/avatars";
import Image from "next/image";
import { Save, KeyRound, Loader2, Check } from "lucide-react";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSavingProfile(true);
    setProfileMsg("");
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchUser();
        setProfileMsg("Đã lưu!");
        setTimeout(() => setProfileMsg(""), 3000);
      }
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwError("");
    setPwMsg("");
    if (newPassword !== confirmPassword) {
      setPwError("Mật khẩu mới không khớp");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Mật khẩu mới phải ít nhất 8 ký tự");
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPwMsg("Đổi mật khẩu thành công!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPwMsg(""), 3000);
      } else {
        setPwError(data.error?.message || "Lỗi không xác định");
      }
    } finally {
      setSavingPw(false);
    }
  }

  const currentAvatar = getRandomAvatar(user?.displayName || "");

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-4xl font-black text-[#3a3a5c]">Settings</h1>

      {/* Profile */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_4px_0_#d1d5db] border border-gray-200">
        <h2 className="text-xl font-black text-[#3a3a5c] mb-5">Profile</h2>

        {/* Avatar preview */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-20 h-20 rounded-2xl bg-[#f0e6ff] p-2">
            <Image
              src={currentAvatar.src}
              alt={currentAvatar.name}
              width={80}
              height={80}
              className="w-full h-full"
            />
          </div>
          <div>
            <p className="font-black text-[#3a3a5c]">{user?.username}</p>
            <p className="text-sm text-gray-400">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-sm font-black text-[#3a3a5c] mb-1.5">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4ecdc4] focus:outline-none font-medium text-[#3a3a5c]"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingProfile || !displayName.trim()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#7c5cbf] hover:bg-[#6b4da8] disabled:bg-gray-300 text-white font-extrabold rounded-xl transition-colors shadow-[0_3px_0_#5e3d9e] disabled:shadow-[0_3px_0_#aaa]"
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Lưu thay đổi
            </button>
            {profileMsg && (
              <span className="flex items-center gap-1 text-green-600 font-bold text-sm">
                <Check className="h-4 w-4" />
                {profileMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_4px_0_#d1d5db] border border-gray-200">
        <h2 className="text-xl font-black text-[#3a3a5c] mb-5 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-[#7c5cbf]" />
          Đổi mật khẩu
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { label: "Mật khẩu hiện tại", value: currentPassword, set: setCurrentPassword },
            { label: "Mật khẩu mới", value: newPassword, set: setNewPassword },
            { label: "Xác nhận mật khẩu mới", value: confirmPassword, set: setConfirmPassword },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="block text-sm font-black text-[#3a3a5c] mb-1.5">
                {label}
              </label>
              <input
                type="password"
                value={value}
                onChange={(e) => set(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#4ecdc4] focus:outline-none font-medium text-[#3a3a5c]"
              />
            </div>
          ))}

          {pwError && (
            <p className="text-red-500 text-sm font-bold">{pwError}</p>
          )}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingPw || !currentPassword || !newPassword || !confirmPassword}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#4ecdc4] hover:bg-[#45b7af] disabled:bg-gray-300 text-white font-extrabold rounded-xl transition-colors shadow-[0_3px_0_#38a89d] disabled:shadow-[0_3px_0_#aaa]"
            >
              {savingPw ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              Đổi mật khẩu
            </button>
            {pwMsg && (
              <span className="flex items-center gap-1 text-green-600 font-bold text-sm">
                <Check className="h-4 w-4" />
                {pwMsg}
              </span>
            )}
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="bg-white/50 rounded-2xl p-5 border border-gray-200">
        <p className="text-sm text-gray-400 font-medium">
          Email: <span className="text-[#3a3a5c] font-bold">{user?.email}</span>
        </p>
        <p className="text-sm text-gray-400 font-medium mt-1">
          Username: <span className="text-[#3a3a5c] font-bold">@{user?.username}</span>
        </p>
      </div>
    </div>
  );
}
