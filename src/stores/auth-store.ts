"use client";

import { create } from "zustand";

interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== "undefined" ? localStorage.getItem("token") : null,
  isLoading: true,

  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    set({ user, token, isLoading: false });
  },

  logout: async () => {
    localStorage.removeItem("token");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    set({ user: null, token: null, isLoading: false });
  },

  fetchUser: async () => {
    const token = get().token;
    if (!token) {
      set({ isLoading: false });
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        await get().logout();
        return;
      }

      const data = await res.json();
      set({ user: data.data.user, isLoading: false });
    } catch {
      await get().logout();
    }
  },
}));
