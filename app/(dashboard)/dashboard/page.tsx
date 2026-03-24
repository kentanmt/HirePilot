import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatRelativeTime, getStatusConfig, formatSalaryRange } from "@/lib/utils";
import {
  Search, FileText, Send, Users, Mic, BarChart3,
  TrendingUp, Calendar, CheckCircle2, Clock, ArrowRight, Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import ResumeUpload from "@/components/ResumeUpload";
import RecommendedJobs from "@/components/RecommendedJobs";

function parseJsonArray(val: any): string[] {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val ?? "[]"); } catch { return []; }
}

async function getDashboardData(userId: string) {
  const [profile, recentApps, readiness, savedJobs, sessions] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.application.findMany({
      where: { userId },
      include: { job: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.readinessScore.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } }),
    prisma.job.count({ where: { userId, isSaved: true } }),
    prisma.interviewSession.count({ where: { userId } }),
  ]);
  return { profile, recentApps, readiness, savedJobs, sessions };
}

const quickActions = [
  { label: "Discover Jobs", href: "/dashboard/jobs", icon: Search, color: "text-violet-400", bg: "bg-violet-500/10 hover:bg-violet-500/15 border-violet-500/20" },
  { label: "Tailor Resume", href: "/dashboard/resume", icon: FileText, color: "text-blue-400", bg: "bg-blue-500/10 hover:bg-blue-500/15 border-blue-500/20" },
  { label: "Apply to Jobs", href: "/dashboard/apply", icon: Send, color: "text-cyan-400", bg: "bg-cyan-500/10 hover:bg-cyan-500/15 border-cyan-500/20" },
  { label: "Reach Out", href: "/dashboard/network", icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/20" },
  { label: "Practice Interview", href: "/dashboard/interview", icon: Mic, color: "text-amber-400", bg: "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/20" },
  { label: "Check Readiness", href: "/dashboard/readiness", icon: BarChart3, color: "text-rose-400", bg: "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/20" },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const userId = session!.user.id;
  const { profile, recentApps, readiness, savedJobs, sessions } = await getDashboardData(userId);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const stats = [
    { label: "Saved Jobs", value: savedJobs, icon: Search, color: "text-violet-400" },
    { label: "Applications", value: recentApps.length, icon: Send, color: "text-cyan-400" },
    { label: "Interview Sessions", value: sessions, icon: Mic, color: "text-amber-400" },
    { label: "Readiness Score", value: readiness ? `${readiness.overallScore}` : "—", icon: BarChart3, color: "text-rose-400", suffix: readiness ? "/ 100" : "" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-violet-400 text-sm font-medium mb-2">
          <Sparkles className="w-4 h-4" />
          <span>{greeting}, {firstName}</span>
        </div>
        <h1 className="text-3xl font-bold text-white">
          {profile?.targetRole
            ? `Your ${profile.targetRole} search`
            : "Your job search dashboard"}
        </h1>
        {(() => { const companies = parseJsonArray(profile?.targetCompanies); return companies.length > 0 && (
          <p className="text-zinc-400 mt-1">
            Targeting: {companies.slice(0, 4).join(", ")}
            {companies.length > 4 && ` +${companies.length - 4} more`}
          </p>
        ); })()}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zinc-500 font-medium">{stat.label}</span>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{stat.value}</span>
                {stat.suffix && <span className="text-xs text-zinc-500">{stat.suffix}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick actions */}
          <div>
            <h2 className="text-sm font-medium text-zinc-400 mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Quick actions
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-150 ${action.bg}`}
                  >
                    <Icon className={`w-4 h-4 ${action.color} shrink-0`} />
                    <span className="text-sm font-medium text-zinc-200">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recommended jobs from resume */}
          <RecommendedJobs />

          {/* Recent applications */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                Recent Applications
              </h2>
              <Link href="/dashboard/apply" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentApps.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-8 text-center">
                <Send className="w-8 h-8 text-zinc-700 mx-auto mb-3" />
                <p className="text-zinc-400 text-sm">No applications yet.</p>
                <Link href="/dashboard/jobs" className="text-violet-400 text-sm hover:text-violet-300">
                  Discover jobs to apply →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentApps.map((app) => {
                  const config = getStatusConfig(app.status);
                  return (
                    <div key={app.id} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-zinc-400">
                          {app.job.company[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{app.job.title}</p>
                        <p className="text-xs text-zinc-500">{app.job.company}</p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`text-xs px-2 py-1 rounded-md font-medium ${config.bg} ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-zinc-600">{formatRelativeTime(app.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Resume upload */}
          <ResumeUpload />

          {/* Readiness score card */}
          {readiness && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                  Readiness Score
                </h3>
                <Link href="/dashboard/readiness" className="text-xs text-violet-400 hover:text-violet-300">
                  Details →
                </Link>
              </div>

              {/* Score gauge */}
              <div className="text-center mb-4">
                <div className="text-5xl font-bold text-white">{readiness.overallScore}</div>
                <div className="text-xs text-zinc-500 mt-1">out of 100</div>
              </div>

              <div className="space-y-2.5">
                {[
                  { label: "Resume", score: readiness.resumeScore, color: "bg-blue-500" },
                  { label: "Applications", score: readiness.applicationScore, color: "bg-cyan-500" },
                  { label: "Network", score: readiness.networkScore, color: "bg-emerald-500" },
                  { label: "Interview", score: readiness.interviewScore, color: "bg-amber-500" },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-zinc-400">{item.label}</span>
                      <span className="text-zinc-300">{item.score}</span>
                    </div>
                    <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${item.color} transition-all duration-700`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action items */}
          {readiness && (() => { const items = parseJsonArray(readiness.actionItems); return items.length > 0 && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2 mb-4">
                <Calendar className="w-4 h-4 text-violet-400" />
                Today&apos;s Action Plan
              </h3>
              <ul className="space-y-2.5">
                {items.slice(0, 4).map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-400">
                    <CheckCircle2 className="w-4 h-4 text-zinc-700 shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ); })()}
        </div>
      </div>
    </div>
  );
}
