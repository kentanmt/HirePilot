"use client";

import { useState, useEffect } from "react";
import { Send, Sparkles, Loader2, ExternalLink, ChevronDown, CheckCircle2, Clock, XCircle, AlertCircle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatRelativeTime, formatSalaryRange, getStatusConfig } from "@/lib/utils";

type ApplicationStatus = "NOT_STARTED" | "IN_PROGRESS" | "APPLIED" | "PHONE_SCREEN" | "INTERVIEW" | "FINAL_ROUND" | "OFFER" | "REJECTED" | "WITHDRAWN";

interface Application {
  id: string;
  status: ApplicationStatus;
  appliedAt: string | null;
  nextStep: string | null;
  nextStepAt: string | null;
  aiGenerated: boolean;
  job: {
    id: string;
    title: string;
    company: string;
    location: string | null;
    remote: boolean;
    salaryMin: number | null;
    salaryMax: number | null;
    matchScore: number | null;
    url: string | null;
  };
}

const STATUS_ORDER: ApplicationStatus[] = [
  "NOT_STARTED", "IN_PROGRESS", "APPLIED", "PHONE_SCREEN", "INTERVIEW", "FINAL_ROUND", "OFFER", "REJECTED", "WITHDRAWN"
];

const PIPELINE_STATUSES: ApplicationStatus[] = ["APPLIED", "PHONE_SCREEN", "INTERVIEW", "FINAL_ROUND", "OFFER"];

export default function AutoApplyPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [streamingId, setStreamingId] = useState<string | null>(null);
  const [streamText, setStreamText] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<ApplicationStatus | "ALL">("ALL");

  useEffect(() => {
    fetch("/api/apply").then((r) => r.json()).then((d) => {
      setApplications(d.applications || []);
      setLoading(false);
    });
  }, []);

  async function handleAutoApply(jobId: string) {
    setApplyingId(jobId);
    setStreamingId(jobId);
    setStreamText((prev) => ({ ...prev, [jobId]: "" }));

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      if (!res.ok || !res.body) throw new Error("Failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        setStreamText((prev) => ({ ...prev, [jobId]: (prev[jobId] || "") + chunk }));
      }

      // Update status in UI
      setApplications((prev) =>
        prev.map((app) =>
          app.job.id === jobId
            ? { ...app, status: "APPLIED", appliedAt: new Date().toISOString(), aiGenerated: true }
            : app
        )
      );
    } finally {
      setApplyingId(null);
      setTimeout(() => setStreamingId(null), 2000);
    }
  }

  async function updateStatus(appId: string, status: ApplicationStatus) {
    await fetch(`/api/apply/${appId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setApplications((prev) =>
      prev.map((a) => (a.id === appId ? { ...a, status } : a))
    );
  }

  const filtered = filter === "ALL" ? applications : applications.filter((a) => a.status === filter);

  const counts = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {} as Record<ApplicationStatus, number>);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-zinc-800 bg-zinc-950 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-white flex items-center gap-2">
              <Send className="w-5 h-5 text-cyan-400" />
              Auto-Apply
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">AI fills applications — track every job in one board</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-zinc-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{counts.OFFER} offers</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>{counts.INTERVIEW} interviews</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Send className="w-4 h-4 text-cyan-400" />
              <span>{counts.APPLIED} applied</span>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setFilter("ALL")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
              filter === "ALL" ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            All ({applications.length})
          </button>
          {STATUS_ORDER.filter((s) => counts[s] > 0 || s === "NOT_STARTED").map((s) => {
            const config = getStatusConfig(s);
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
                  filter === s ? `${config.bg} ${config.color}` : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {config.label} {counts[s] > 0 ? `(${counts[s]})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Application list */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <Send className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">No applications yet</h3>
            <p className="text-zinc-400 text-sm max-w-xs">
              Save jobs in Job Discovery and they&apos;ll appear here ready to apply.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {filtered.map((app) => {
              const config = getStatusConfig(app.status);
              const isApplying = applyingId === app.job.id;
              const isStreaming = streamingId === app.job.id;

              return (
                <div
                  key={app.id}
                  className={cn(
                    "bg-zinc-900 border rounded-2xl p-5 transition-all",
                    app.status === "OFFER" ? "border-emerald-500/30" :
                    app.status === "REJECTED" ? "border-zinc-800 opacity-70" :
                    "border-zinc-800 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-start gap-4">
                    {/* Company avatar */}
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0 text-sm font-bold text-zinc-400">
                      {app.job.company[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-white text-sm">{app.job.title}</h3>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {app.job.company}
                            {app.job.location && ` · ${app.job.location}`}
                            {app.job.remote && " · Remote"}
                          </p>
                          {(app.job.salaryMin || app.job.salaryMax) && (
                            <p className="text-xs text-zinc-500 mt-0.5">
                              {formatSalaryRange(app.job.salaryMin, app.job.salaryMax)}
                            </p>
                          )}
                        </div>

                        {/* Status badge + change */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={cn("px-2.5 py-1 rounded-lg text-xs font-medium", config.bg, config.color)}>
                            {config.label}
                          </span>
                          {app.aiGenerated && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">
                              AI
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pipeline progress */}
                      <div className="flex items-center gap-1 mt-3">
                        {PIPELINE_STATUSES.map((s, i) => {
                          const idx = PIPELINE_STATUSES.indexOf(app.status as ApplicationStatus);
                          const isPast = i <= idx;
                          const isCurrent = s === app.status;
                          return (
                            <div key={s} className="flex items-center gap-1 flex-1">
                              <div className={cn(
                                "h-1.5 flex-1 rounded-full transition-all",
                                isPast ? "bg-cyan-500" : "bg-zinc-800"
                              )} />
                              {i === PIPELINE_STATUSES.length - 1 && (
                                <div className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  isPast ? "bg-cyan-500" : "bg-zinc-700"
                                )} />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between mt-1">
                        {PIPELINE_STATUSES.map((s) => (
                          <span key={s} className={cn("text-[9px]", s === app.status ? "text-cyan-400" : "text-zinc-700")}>
                            {getStatusConfig(s).label}
                          </span>
                        ))}
                      </div>

                      {/* Streaming output */}
                      {isStreaming && streamText[app.job.id] && (
                        <div className="mt-3 p-3 bg-zinc-950 rounded-lg border border-zinc-800">
                          <p className="text-[11px] text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">
                            {streamText[app.job.id]}
                            <span className="inline-block w-1.5 h-3 bg-cyan-400 animate-pulse ml-0.5 align-middle" />
                          </p>
                        </div>
                      )}

                      {/* Meta info */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-zinc-600">
                        {app.appliedAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Applied {formatRelativeTime(app.appliedAt)}
                          </span>
                        )}
                        {app.nextStep && (
                          <span className="flex items-center gap-1 text-amber-500">
                            <Calendar className="w-3 h-3" />
                            {app.nextStep}
                            {app.nextStepAt && ` · ${formatRelativeTime(app.nextStepAt)}`}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 mt-3">
                        {app.status === "NOT_STARTED" && (
                          <Button
                            size="sm"
                            onClick={() => handleAutoApply(app.job.id)}
                            disabled={isApplying}
                            className="h-7 text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                          >
                            {isApplying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                            Auto-Apply
                          </Button>
                        )}

                        {/* Status updater */}
                        <div className="relative group">
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-500">
                            Update status <ChevronDown className="w-3 h-3 ml-1" />
                          </Button>
                          <div className="absolute left-0 top-full mt-1 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl z-10 hidden group-hover:block w-44">
                            {STATUS_ORDER.filter((s) => s !== app.status).map((s) => {
                              const c = getStatusConfig(s);
                              return (
                                <button
                                  key={s}
                                  onClick={() => updateStatus(app.id, s)}
                                  className={cn("w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 first:rounded-t-xl last:rounded-b-xl", c.color)}
                                >
                                  {c.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {app.job.url && (
                          <a href={app.job.url} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-zinc-500">
                              <ExternalLink className="w-3 h-3" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
