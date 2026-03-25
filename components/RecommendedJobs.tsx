"use client";

import { useEffect, useState } from "react";
import { Sparkles, Briefcase, MapPin, DollarSign, Bookmark, BookmarkCheck, RefreshCw, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface RecommendedJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  salaryMin: number | null;
  salaryMax: number | null;
  matchScore: number | null;
  matchReason: string | null;
  requirements: string[];
  source: string | null;
  isSaved: boolean;
}

function formatSalary(min: number | null, max: number | null) {
  if (!min && !max) return null;
  const fmt = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  return `Up to ${fmt(max!)}`;
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25" :
    score >= 75 ? "bg-violet-500/15 text-violet-400 border-violet-500/25" :
    "bg-zinc-700/40 text-zinc-400 border-zinc-700";
  return (
    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", color)}>
      {score}% match
    </span>
  );
}

export default function RecommendedJobs() {
  const [jobs, setJobs] = useState<RecommendedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [savingId, setSavingId] = useState<string | null>(null);
  const [noProfile, setNoProfile] = useState(false);
  const [noCredits, setNoCredits] = useState(false);

  async function load(forceRefresh = false) {
    if (forceRefresh) {
      setRefreshing(true);
      await fetch("/api/jobs/recommended", { method: "POST" });
    }
    setLoading(true);
    try {
      const res = await fetch("/api/jobs/recommended");
      const data = await res.json();
      if (data.reason === "no_profile") { setNoProfile(true); return; }
      if (data.reason === "no_credits") { setNoCredits(true); return; }
      setJobs(data.jobs || []);
      const alreadySaved = new Set<string>(
        (data.jobs || []).filter((j: RecommendedJob) => j.isSaved).map((j: RecommendedJob) => j.id)
      );
      setSavedIds(alreadySaved);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSave(job: RecommendedJob) {
    if (savedIds.has(job.id)) return;
    setSavingId(job.id);
    try {
      const res = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      if (res.ok) setSavedIds((prev) => new Set([...prev, job.id]));
    } finally {
      setSavingId(null);
    }
  }

  if (!loading && noProfile) return null;
  if (!loading && noCredits) return (
    <div className="mb-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
      <p className="text-sm text-amber-400 font-medium">AI credits exhausted</p>
      <p className="text-xs text-zinc-500 mt-1">Top up at console.anthropic.com/settings/billing to enable recommendations.</p>
    </div>
  );

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-zinc-400 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          Recommended for You
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400 font-medium">
            AI
          </span>
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("w-3 h-3", (refreshing || loading) && "animate-spin")} />
            Refresh
          </button>
          <Link href="/dashboard/jobs" className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1">
            Discover more <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 animate-pulse">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/2" />
                </div>
                <div className="h-5 w-16 bg-zinc-800 rounded-full" />
              </div>
              <div className="h-3 bg-zinc-800 rounded w-full mb-1.5" />
              <div className="h-3 bg-zinc-800 rounded w-5/6" />
            </div>
          ))}
        </div>
      )}

      {/* Job cards */}
      {!loading && jobs.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {jobs.map((job) => {
            const isSaved = savedIds.has(job.id);
            const isSaving = savingId === job.id;
            const salary = formatSalary(job.salaryMin, job.salaryMax);

            return (
              <div
                key={job.id}
                className={cn(
                  "group bg-zinc-900 border rounded-xl p-4 transition-all hover:border-zinc-700",
                  isSaved ? "border-emerald-500/30" : "border-zinc-800"
                )}
              >
                <div className="flex items-start gap-3">
                  {/* Company avatar */}
                  <div className="w-9 h-9 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-sm font-bold text-zinc-400">
                    {job.company[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{job.title}</p>
                        <p className="text-xs text-zinc-400 truncate">{job.company}</p>
                      </div>
                      {job.matchScore && <ScoreBadge score={job.matchScore} />}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-2 text-[11px] text-zinc-500">
                      {(job.location || job.remote) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.remote ? "Remote" : job.location}
                        </span>
                      )}
                      {salary && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {salary}
                        </span>
                      )}
                    </div>

                    {/* Why it fits */}
                    {job.matchReason && (
                      <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed line-clamp-2">
                        {job.matchReason}
                      </p>
                    )}

                    {/* Skills pills */}
                    {Array.isArray(job.requirements) && job.requirements.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {job.requirements.slice(0, 4).map((r) => (
                          <span key={r} className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700">
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save button */}
                <div className="mt-3 pt-3 border-t border-zinc-800 flex justify-end">
                  <button
                    onClick={() => handleSave(job)}
                    disabled={isSaved || isSaving}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all",
                      isSaved
                        ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 cursor-default"
                        : "text-zinc-400 hover:text-violet-300 hover:bg-violet-500/10 border border-zinc-700 hover:border-violet-500/30"
                    )}
                  >
                    {isSaving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : isSaved ? (
                      <BookmarkCheck className="w-3 h-3" />
                    ) : (
                      <Bookmark className="w-3 h-3" />
                    )}
                    {isSaved ? "Saved" : "Save job"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty fallback */}
      {!loading && jobs.length === 0 && !noProfile && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center">
          <Briefcase className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-zinc-400 text-sm">Couldn&apos;t generate recommendations right now.</p>
          <button onClick={() => load(true)} className="text-violet-400 text-sm hover:text-violet-300 mt-1">
            Try again →
          </button>
        </div>
      )}
    </div>
  );
}
