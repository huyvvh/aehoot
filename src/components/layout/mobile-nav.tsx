"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  BookOpen,
  Search,
  FolderOpen,
  Heart,
  PenSquare,
  LogOut,
  Play,
  Menu,
  History,
  Settings,
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Stats", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/discover", label: "Discover", icon: Search },
  { href: "/dashboard/sets/new", label: "Set Creator", icon: PenSquare },
  { href: "/dashboard/sets", label: "My Sets", icon: BookOpen },
  { href: "/dashboard/folders", label: "Folders", icon: FolderOpen },
  { href: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { href: "/dashboard/games", label: "History", icon: History },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    setOpen(false);
  };

  return (
    <div className="md:hidden flex items-center h-14 px-4 sticky top-0 z-40"
      style={{ background: "linear-gradient(90deg, #8b5dc8, #a855f7)" }}
    >
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" className="text-white hover:bg-white/15" />}>
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0 border-none"
          style={{ background: "linear-gradient(180deg, #8b5dc8 0%, #a855f7 100%)" }}
        >
          <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
          <div className="px-5 pt-5 pb-3">
            <h1 className="text-[28px] font-black italic text-white drop-shadow-md">AEHoot</h1>
          </div>
          <div className="px-4 mb-3">
            <Link
              href="/dashboard/host"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-2 w-full py-3 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-extrabold text-lg rounded-xl transition-colors shadow-[0_4px_0_#38a89d]"
            >
              <Play className="h-5 w-5 fill-white" />
              Play
            </Link>
          </div>
          <nav className="flex-1 px-3 space-y-0.5">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-bold transition-all",
                    isActive
                      ? "bg-white/25 text-white"
                      : "text-white/80 hover:bg-white/10"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/20 p-4">
            <div className="flex items-center gap-2.5 px-2 py-2">
              <div className="w-8 h-8 rounded-lg bg-[#4ecdc4] flex items-center justify-center">
                <span className="text-white text-xs font-black">
                  {user?.displayName?.charAt(0)?.toUpperCase() || "U"}
                </span>
              </div>
              <p className="text-sm font-bold text-white truncate">{user?.displayName || "User"}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 text-sm font-bold transition-all"
            >
              <LogOut className="h-4 w-4" />
              Đăng xuất
            </button>
          </div>
        </SheetContent>
      </Sheet>
      <div className="flex-1 flex items-center justify-center">
        <Link href="/dashboard">
          <span className="text-xl font-black italic text-white drop-shadow-md">AEHoot</span>
        </Link>
      </div>
      <div className="w-10" />
    </div>
  );
}
