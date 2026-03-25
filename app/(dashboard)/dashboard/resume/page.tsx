"use client";

import { useState, useCallback, useEffect } from "react";
import { FileText, Sparkles, Loader2, Download, Plus, Minus, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SavedJob {
  id: string;
  title: string;
  company: string;
  matchScore: number | null;
}

interface ResumeChange {
  type: "added" | "removed" | "modified" | "reordered";
  section: string;
  description: string;
}

export default function ResumeTailorPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [baseResume, setBaseResume] = useState<string>("");
  const [resumeLoaded, setResumeLoaded] = useState(false);
  // null = not yet run, string = result (may be empty)
  const [tailoredResume, setTailoredResume] = useState<string | null>(null);
  const [changes, setChanges] = useState<ResumeChange[]>([]);
  const [loading, setLoading] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [view, setView] = useState<"original" | "tailored" | "diff">("diff");

  useEffect(() => {
    // Load saved jobs
    fetch("/api/jobs/saved").then((r) => r.json()).then((d) => setSavedJobs(d.jobs || []));
    // Load stored base resume from DB (set during onboarding or upload)
    fetch("/api/resume").then((r) => r.json()).then((d) => {
      if (d.content) setBaseResume(d.content);
      setResumeLoaded(true);
    });
  }, []);

  // Persist any edits back to DB (debounced via blur)
  function handleResumeBlur() {
    if (!baseResume.trim()) return;
    fetch("/api/resume", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: baseResume, fileName: "pasted-resume.txt" }),
    });
  }

  async function handleTailor() {
    if (!selectedJobId || !baseResume.trim()) return;
    setLoading(true);
    setTailoredResume(null);
    setChanges([]);
    setTailorError(null);

    try {
      const res = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId, resumeContent: baseResume }),
      });

      const data = await res.json();

      if (!res.ok) {
        setTailorError(data.error || "Failed to tailor resume");
        return;
      }

      const tailored: string = data.tailored ?? "";
      const changeList: ResumeChange[] = Array.isArray(data.changes) ? data.changes : [];

      setTailoredResume(tailored);
      setChanges(changeList);
      setView(changeList.length > 0 ? "diff" : "tailored");
    } catch (err: any) {
      setTailorError(err?.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const selectedJob = savedJobs.find((j) => j.id === selectedJobId);

  const changeTypeConfig = {
    added: { icon: Plus, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    removed: { icon: Minus, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    modified: { icon: ArrowRight, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    reordered: { icon: ArrowRight, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  };

  const canTailor = baseResume.trim().length > 50 && !!selectedJobId && !loading;
  const resumeTooShort = resumeLoaded && baseResume.trim().length > 0 && baseResume.trim().length <= 50;

  return (
    <div className="h-full flex">
      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-5">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Resume Tailor
          </h1>
          <p className="text-xs text-zinc-500 mt-1">AI rewrites your resume for each job</p>
        </div>

        {/* Resume text input — always visible */}
        <div className="space-y-1.5 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400 font-medium">Your resume</p>
            {baseResume.trim().length > 50 && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Ready
              </span>
            )}
          </div>
          <textarea
            value={baseResume}
            onChange={(e) => setBaseResume(e.target.value)}
            onBlur={handleResumeBlur}
            placeholder={resumeLoaded
              ? "Paste your full resume text here...\n\nTip: Copy from Word, Google Docs, or Notion — plain text works best."
              : "Loading..."}
            rows={12}
            className="w-full flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
          />
          {resumeTooShort && (
            <p className="text-[10px] text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Resume too short — paste the full text
            </p>
          )}
          {resumeLoaded && !baseResume.trim() && (
            <p className="text-[10px] text-zinc-500">
              No resume found. Paste yours above or{" "}
              <a href="/dashboard" className="text-violet-400 hover:text-violet-300">upload on the dashboard</a>.
            </p>
          )}
        </div>

        {/* Job selector */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Target job</p>
          {savedJobs.length === 0 ? (
            <p className="text-xs text-zinc-600">No saved jobs yet. Discover and save jobs first.</p>
          ) : (
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {savedJobs.map((job) => (
                <button
                  key={job.id}
                  onClick={() => setSelectedJobId(job.id)}
                  className={cn(
                    "w-full flex items-center gap-2 p-3 rounded-xl border text-left transition-colors",
                    selectedJobId === job.id
                      ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                      : "border-zinc-800 hover:border-zinc-700 text-zinc-300"
                  )}
                >
                  <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0 text-xs font-bold text-zinc-400">
                    {job.company[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{job.title}</p>
                    <p className="text-[10px] text-zinc-600">{job.company}</p>
                  </div>
                  {job.matchScore && (
                    <span className="text-xs text-zinc-500">{job.matchScore}%</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleTailor}
          disabled={!canTailor}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {loading ? "Tailoring..." : "Tailor Resume"}
        </Button>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* View tabs — only when result is ready */}
        {tailoredResume !== null && (
          <div className="flex items-center gap-1 p-4 border-b border-zinc-800 bg-zinc-950">
            {(["diff", "tailored", "original"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                  view === v ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {v === "diff" ? "Changes" : v}
              </button>
            ))}
            <div className="ml-auto">
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs border-zinc-700"
                onClick={() => {
                  const blob = new Blob([tailoredResume], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `resume-${selectedJob?.company ?? "tailored"}.txt`;
                  a.click();
                }}
              >
                <Download className="w-3 h-3 mr-1.5" />
                Download
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Loader2 className="w-7 h-7 text-blue-400 animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-white">
                  Tailoring for {selectedJob?.company ?? "this role"}...
                </p>
                <p className="text-xs text-zinc-500 mt-1">Rewriting sections & optimizing for ATS</p>
              </div>
            </div>
          )}

          {/* Error */}
          {!loading && tailorError && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <AlertCircle className="w-7 h-7 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Tailoring failed</p>
                <p className="text-xs text-red-400 mt-1 max-w-xs">{tailorError}</p>
              </div>
              <button onClick={handleTailor} className="text-xs text-blue-400 hover:text-blue-300 mt-1">
                Try again →
              </button>
            </div>
          )}

          {/* Initial empty state */}
          {!loading && !tailorError && tailoredResume === null && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Tailor your resume</h3>
              <p className="text-zinc-400 text-sm max-w-xs">
                Paste your resume on the left, select a saved job, and AI will rewrite it — optimized for ATS and that specific role.
              </p>
            </div>
          )}

          {/* Changes (diff) view */}
          {!loading && tailoredResume !== null && view === "diff" && (
            <div className="space-y-3">
              {changes.length > 0 ? (
                <>
                  <h3 className="text-sm font-medium text-zinc-300 mb-4">
                    {changes.length} changes made for{" "}
                    <span className="text-white">{selectedJob?.title} at {selectedJob?.company}</span>
                  </h3>
                  {changes.map((change, i) => {
                    const config = changeTypeConfig[change.type] ?? changeTypeConfig.modified;
                    const Icon = config.icon;
                    return (
                      <div key={i} className={cn("flex items-start gap-3 p-3.5 rounded-xl border", config.bg)}>
                        <Icon className={cn("w-4 h-4 shrink-0 mt-0.5", config.color)} />
                        <div>
                          <p className={cn("text-xs font-semibold uppercase tracking-wide", config.color)}>{change.type}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">{change.section}</p>
                          <p className="text-sm text-zinc-200 mt-1">{change.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-zinc-300">Resume tailored — switch to the Tailored tab to see the result.</p>
                </div>
              )}
            </div>
          )}

          {/* Tailored view */}
          {!loading && tailoredResume !== null && view === "tailored" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              {tailoredResume ? (
                <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed">{tailoredResume}</pre>
              ) : (
                <p className="text-zinc-500 text-sm text-center py-8">No tailored content returned. Try again.</p>
              )}
            </div>
          )}

          {/* Original view */}
          {!loading && tailoredResume !== null && view === "original" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
              <pre className="text-sm text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">{baseResume}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
