"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Search,
  FileText,
  Send,
  Users,
  Mic,
  BarChart3,
  Sparkles,
  LogOut,
  ChevronRight,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    color: "text-zinc-400",
    activeColor: "text-white",
    activeBg: "bg-zinc-800",
  },
  {
    label: "Job Discovery",
    href: "/dashboard/jobs",
    icon: Search,
    color: "text-zinc-400",
    activeColor: "text-violet-300",
    activeBg: "bg-violet-500/10",
    accent: "violet",
  },
  {
    label: "Resume Tailor",
    href: "/dashboard/resume",
    icon: FileText,
    color: "text-zinc-400",
    activeColor: "text-blue-300",
    activeBg: "bg-blue-500/10",
    accent: "blue",
  },
  {
    label: "Auto-Apply",
    href: "/dashboard/apply",
    icon: Send,
    color: "text-zinc-400",
    activeColor: "text-cyan-300",
    activeBg: "bg-cyan-500/10",
    accent: "cyan",
  },
  {
    label: "Network",
    href: "/dashboard/network",
    icon: Users,
    color: "text-zinc-400",
    activeColor: "text-emerald-300",
    activeBg: "bg-emerald-500/10",
    accent: "emerald",
  },
  {
    label: "Interview Prep",
    href: "/dashboard/interview",
    icon: Mic,
    color: "text-zinc-400",
    activeColor: "text-amber-300",
    activeBg: "bg-amber-500/10",
    accent: "amber",
  },
  {
    label: "Readiness Score",
    href: "/dashboard/readiness",
    icon: BarChart3,
    color: "text-zinc-400",
    activeColor: "text-rose-300",
    activeBg: "bg-rose-500/10",
    accent: "rose",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "?";

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="flex flex-col w-60 h-screen bg-zinc-950 border-r border-zinc-800/60 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-zinc-800/60">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-white tracking-tight">Copilot</span>
          <span className="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/20">
            AI
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? `${item.activeColor} ${item.activeBg}`
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                )}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive ? item.activeColor : item.color
                  )}
                />
                <span className="truncate">{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3 h-3 ml-auto shrink-0 opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom: user + settings */}
        <div className="border-t border-zinc-800/60 p-3 space-y-1">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60 transition-colors"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </Link>

          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <Avatar className="w-7 h-7">
              <AvatarImage src={session?.user?.image ?? ""} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-300 truncate">
                {session?.user?.name ?? "User"}
              </p>
              <p className="text-[10px] text-zinc-600 truncate">
                {session?.user?.email ?? ""}
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 rounded"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sign out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>
    </TooltipProvider>
  );
}
