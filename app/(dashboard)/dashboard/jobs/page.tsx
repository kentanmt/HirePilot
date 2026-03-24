"use client";

import { useState, useRef } from "react";
import { Search, Sparkles, MapPin, Building2, DollarSign, ExternalLink, Bookmark, BookmarkCheck, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn, formatSalaryRange, getScoreColor } from "@/lib/utils";

const SENIORITY_OPTIONS = ["Junior", "Mid-level", "Senior", "Lead", "Principal", "Director"];
const JOB_TYPES = ["Full-time", "Contract", "Part-time", "Internship"];

interface DiscoveredJob {
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salaryMin?: number;
  salaryMax?: number;
  description: string;
  requirements: string[];
  url?: string;
  source?: string;
  matchScore: number;
  matchReason: string;
}

export default function JobDiscoveryPage() {
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [seniority, setSeniority] = useState("Senior");
  const [jobType, setJobType] = useState("Full-time");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [jobs, setJobs] = useState<DiscoveredJob[]>([]);
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set());
  const [savingId, setSavingId] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleDiscover() {
    if (!role.trim()) return;
    setLoading(true);
    setStreaming(true);
    setStreamText("");
    setJobs([]);

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/jobs/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, location, seniority, jobType }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) throw new Error("Failed to start discovery");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        accumulated += chunk;
        setStreamText(accumulated);

        // Try to parse jobs from accumulated text
        try {
          const parsed = JSON.parse(accumulated);
          if (Array.isArray(parsed)) {
            setJobs(parsed);
            setStreaming(false);
          }
        } catch {
          // Still accumulating
        }
      }

      // Final parse attempt
      try {
        const parsed = JSON.parse(accumulated);
        if (Array.isArray(parsed)) setJobs(parsed);
      } catch {
        // Use streaming text as-is if not parseable
      }
    } catch (err: unknown) {
      if ((err as Error).name !== "AbortError") {
        console.error(err);
      }
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  }

  async function handleSave(job: DiscoveredJob, index: number) {
    setSavingId(index);
    try {
      const res = await fetch("/api/jobs/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      if (res.ok) {
        setSavedIds((prev) => new Set([...prev, index]));
      }
    } finally {
      setSavingId(null);
    }
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 85) return "emerald";
    if (score >= 70) return "violet";
    if (score >= 50) return "amber";
    return "red";
  };

  return (
    <div className="h-full flex">
      {/* Left panel — search form */}
      <div className="w-72 shrink-0 border-r border-zinc-800 bg-zinc-950 p-5 flex flex-col gap-4">
        <div>
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            <Search className="w-4 h-4 text-violet-400" />
            Job Discovery
          </h1>
          <p className="text-[11px] text-zinc-500 mt-0.5">AI finds and scores live jobs for you</p>
        </div>

        <div className="space-y-3">
          {/* Role */}
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">Role</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Software Engineer"
              className="bg-zinc-900 border-zinc-700 focus:border-violet-500 h-9 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleDiscover()}
            />
          </div>

          {/* Location */}
          <div className="space-y-1">
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">Location</Label>
            <div className="relative">
              <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, state, or Remote"
                className="bg-zinc-900 border-zinc-700 focus:border-violet-500 h-9 text-sm pr-8"
              />
            </div>
          </div>

          {/* Seniority */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">Seniority</Label>
            <div className="flex flex-wrap gap-1.5">
              {SENIORITY_OPTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => setSeniority(s)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                    seniority === s
                      ? "bg-violet-500 border-violet-500 text-white"
                      : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Job type */}
          <div className="space-y-1.5">
            <Label className="text-[11px] text-zinc-500 uppercase tracking-wide font-medium">Job Type</Label>
            <div className="flex flex-wrap gap-1.5">
              {JOB_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setJobType(t)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                    jobType === t
                      ? "bg-violet-500 border-violet-500 text-white"
                      : "border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500"
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <Button
            onClick={handleDiscover}
            disabled={loading || !role.trim()}
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {loading ? "Discovering..." : "Discover Jobs"}
          </Button>
          <p className="text-[10px] text-zinc-600 text-center">
            Pulls from YC · Greenhouse · Remotive · HN Hiring
          </p>
        </div>
      </div>

      {/* Right panel — results */}
      <div className="flex-1 overflow-y-auto">
        {/* Streaming indicator */}
        {streaming && (
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3 text-violet-400">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-medium">Searching for {seniority} {role} roles...</p>
                <p className="text-xs text-zinc-500 mt-0.5">Pulling from YC companies, Remotive, Arbeitnow, HN Who&apos;s Hiring &amp; more — scoring matches with AI</p>
              </div>
            </div>
            {streamText && (
              <div className="mt-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <p className="text-xs text-zinc-400 font-mono leading-relaxed line-clamp-4">{streamText}</p>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!loading && jobs.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Find your perfect role</h3>
            <p className="text-zinc-400 text-sm max-w-xs">
              Enter a role and location, then let AI discover and score jobs that match your profile.
            </p>
          </div>
        )}

        {/* Job results */}
        {jobs.length > 0 && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-zinc-300">
                {jobs.length} jobs found for <span className="text-white">{seniority} {role}</span>
                <span className="ml-2 text-xs text-zinc-600">— live from YC companies, Greenhouse, Remotive &amp; HN</span>
              </h2>
            </div>
            <div className="space-y-3">
              {jobs.map((job, i) => (
                <div
                  key={i}
                  className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-2xl p-5 transition-all group animate-fade-in"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Company logo placeholder */}
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-lg font-bold text-zinc-400">
                        {job.company[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-white text-base leading-tight">{job.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {job.company}
                          </span>
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {job.location}
                            </span>
                          )}
                          {job.remote && (
                            <Badge variant="emerald" className="text-[10px] py-0">Remote</Badge>
                          )}
                          {job.source && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-zinc-700 shrink-0">
                              {job.source}
                            </span>
                          )}
                        </div>
                        {(job.salaryMin || job.salaryMax) && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-zinc-400">
                            <DollarSign className="w-3 h-3" />
                            {formatSalaryRange(job.salaryMin, job.salaryMax)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Match score */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className={cn("text-2xl font-bold", getScoreColor(job.matchScore))}>
                        {job.matchScore}
                        <span className="text-xs font-normal text-zinc-600">%</span>
                      </div>
                      <span className="text-[10px] text-zinc-600 uppercase tracking-wide">match</span>
                    </div>
                  </div>

                  {/* Match score bar */}
                  <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-700",
                        job.matchScore >= 85 ? "bg-emerald-500" :
                        job.matchScore >= 70 ? "bg-violet-500" :
                        job.matchScore >= 50 ? "bg-amber-500" : "bg-red-500"
                      )}
                      style={{ width: `${job.matchScore}%` }}
                    />
                  </div>

                  {/* Match reason */}
                  {job.matchReason && (
                    <p className="mt-3 text-xs text-zinc-400 leading-relaxed">
                      <span className="text-violet-400 font-medium">Why this fits: </span>
                      {job.matchReason}
                    </p>
                  )}

                  {/* Requirements */}
                  {job.requirements.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {job.requirements.slice(0, 5).map((req) => (
                        <span key={req} className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 text-xs border border-zinc-700">
                          {req}
                        </span>
                      ))}
                      {job.requirements.length > 5 && (
                        <span className="text-xs text-zinc-600">+{job.requirements.length - 5} more</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800">
                    <Button
                      size="sm"
                      onClick={() => handleSave(job, i)}
                      disabled={savedIds.has(i) || savingId === i}
                      variant={savedIds.has(i) ? "secondary" : "default"}
                      className={cn(
                        "h-8 text-xs",
                        savedIds.has(i) ? "text-emerald-400" : "bg-violet-600 hover:bg-violet-700 text-white"
                      )}
                    >
                      {savingId === i ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : savedIds.has(i) ? (
                        <BookmarkCheck className="w-3 h-3 mr-1" />
                      ) : (
                        <Bookmark className="w-3 h-3 mr-1" />
                      )}
                      {savedIds.has(i) ? "Saved" : "Save Job"}
                    </Button>
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-zinc-400">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View listing
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
