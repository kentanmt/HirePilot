import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
  compact: boolean = false
): string {
  if (compact) {
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatSalaryRange(
  min?: number | null,
  max?: number | null,
  currency: string = "USD"
): string {
  if (!min && !max) return "Salary not listed";
  if (min && max)
    return `${formatCurrency(min, currency, true)} – ${formatCurrency(max, currency, true)}`;
  if (min) return `${formatCurrency(min, currency, true)}+`;
  return `Up to ${formatCurrency(max!, currency, true)}`;
}

export function formatRelativeTime(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getScoreColor(score: number): string {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-violet-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

export function getScoreBg(score: number): string {
  if (score >= 85) return "bg-emerald-500/10 border-emerald-500/20";
  if (score >= 70) return "bg-violet-500/10 border-violet-500/20";
  if (score >= 50) return "bg-amber-500/10 border-amber-500/20";
  return "bg-red-500/10 border-red-500/20";
}

export function getStatusConfig(status: string) {
  const configs: Record<string, { label: string; color: string; bg: string }> = {
    NOT_STARTED: { label: "Not Started", color: "text-zinc-400", bg: "bg-zinc-800" },
    IN_PROGRESS: { label: "In Progress", color: "text-blue-400", bg: "bg-blue-500/10" },
    APPLIED: { label: "Applied", color: "text-violet-400", bg: "bg-violet-500/10" },
    PHONE_SCREEN: { label: "Phone Screen", color: "text-cyan-400", bg: "bg-cyan-500/10" },
    INTERVIEW: { label: "Interview", color: "text-amber-400", bg: "bg-amber-500/10" },
    FINAL_ROUND: { label: "Final Round", color: "text-orange-400", bg: "bg-orange-500/10" },
    OFFER: { label: "Offer!", color: "text-emerald-400", bg: "bg-emerald-500/10" },
    REJECTED: { label: "Rejected", color: "text-red-400", bg: "bg-red-500/10" },
    WITHDRAWN: { label: "Withdrawn", color: "text-zinc-500", bg: "bg-zinc-800" },
  };
  return configs[status] || configs.NOT_STARTED;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
