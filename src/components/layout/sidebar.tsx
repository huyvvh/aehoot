"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Search,
  BookOpen,
  FolderOpen,
  Heart,
  Play,
  PenSquare,
  History,
  Settings,
  LogIn,
  FileText,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Stats", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/discover", label: "Discover", icon: Search },
  { href: "/dashboard/sets/new", label: "Set Creator", icon: PenSquare },
  { href: "/dashboard/sets", label: "My Sets", icon: BookOpen },
  { href: "/dashboard/folders", label: "Folders", icon: FolderOpen },
  { href: "/dashboard/favorites", label: "Favorites", icon: Heart },
  { href: "/dashboard/documents", label: "Tài liệu", icon: FileText },
];

const bottomIcons = [
  { href: "/dashboard/games", icon: History, label: "History" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-[200px] md:flex-col md:fixed md:inset-y-0 z-30"
      style={{ background: "linear-gradient(180deg, #8b5dc8 0%, #a855f7 50%, #9b4dca 100%)" }}
    >
      <div className="flex flex-col flex-1 min-h-0 px-3 py-4">
        {/* Logo */}
        <div className="px-2 mb-3">
          <Link href="/dashboard">
            <h1 className="text-[32px] font-black italic text-white drop-shadow-md">AEHoot</h1>
          </Link>
        </div>

        {/* Host/Play Buttons */}
        <div className="mb-4 px-1 flex flex-col gap-2">
          <Link
            href="/dashboard/host"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#4ecdc4] hover:bg-[#45b7af] text-white font-extrabold text-lg rounded-xl transition-colors shadow-[0_5px_0_#38a89d,0_6px_10px_rgba(0,0,0,0.15)]"
          >
            <Play className="h-5 w-5 fill-white" />
            Host
          </Link>
          <Link
            href="/play"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-white/15 hover:bg-white/25 text-white font-bold text-base rounded-xl transition-colors border border-white/20"
          >
            <LogIn className="h-4 w-4" />
            Join Game
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] font-bold transition-all",
                  isActive
                    ? "bg-white/25 text-white shadow-sm"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom icons */}
        <div className="flex items-center justify-center gap-2 pt-3 border-t border-white/20">
          {bottomIcons.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "p-2.5 rounded-xl transition-colors",
                pathname.startsWith(item.href)
                  ? "bg-white/25 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
              title={item.label}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
