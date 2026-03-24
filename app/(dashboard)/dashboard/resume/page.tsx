"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, Sparkles, Loader2, Download, Plus, Minus, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [baseResume, setBaseResume] = useState<string | null>(null);
  const [tailoredResume, setTailoredResume] = useState<string | null>(null);
  const [changes, setChanges] = useState<ResumeChange[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [view, setView] = useState<"original" | "tailored" | "diff">("diff");

  useEffect(() => {
    fetch("/api/jobs/saved").then((r) => r.json()).then((d) => setSavedJobs(d.jobs || []));
    // Load stored base resume
    fetch("/api/resume").then((r) => r.json()).then((d) => {
      if (d.content) setBaseResume(d.content);
    });
  }, []);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploadedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const cleaned = text
        .split("\n")
        .filter((line) => /^[\x20-\x7E\t]+$/.test(line) && line.trim().length > 2)
        .join("\n")
        .replace(/\s{3,}/g, "\n")
        .trim();
      const content = cleaned.length > 100 ? cleaned : text.slice(0, 8000);
      setBaseResume(content);
      // Persist to API
      fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, fileName: file.name }),
      });
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"], "application/msword": [".doc"], "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"] },
    maxFiles: 1,
  });

  async function handleTailor() {
    if (!selectedJobId || !baseResume) return;
    setStreaming(true);
    setStreamText("");
    setTailoredResume(null);
    setChanges([]);

    try {
      const res = await fetch("/api/resume/tailor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId, resumeContent: baseResume }),
      });

      if (!res.ok || !res.body) throw new Error("Failed to tailor resume");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
        setStreamText(accumulated);
      }

      // Strip markdown code fences Claude sometimes wraps JSON in
      const cleanedJson = accumulated
        .replace(/^```(?:json)?\s*/im, "")
        .replace(/\s*```\s*$/m, "")
        .trim();

      // Try to parse structured response
      try {
        const parsed = JSON.parse(cleanedJson);
        if (parsed.tailored) setTailoredResume(parsed.tailored);
        if (parsed.changes) setChanges(parsed.changes);
        // Auto-switch to best view
        setView(parsed.changes?.length > 0 ? "diff" : "tailored");
      } catch {
        // Not JSON — show raw output
        setTailoredResume(accumulated);
        setView("tailored");
      }
    } finally {
      setStreaming(false);
    }
  }

  const selectedJob = savedJobs.find((j) => j.id === selectedJobId);

  const changeTypeConfig = {
    added: { icon: Plus, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    removed: { icon: Minus, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
    modified: { icon: ArrowRight, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    reordered: { icon: ArrowRight, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  };

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

        {/* Upload zone */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors",
            isDragActive ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-zinc-600",
            uploadedFile && "border-emerald-600 bg-emerald-500/5"
          )}
        >
          <input {...getInputProps()} />
          {uploadedFile ? (
            <div>
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-emerald-400 font-medium">{uploadedFile.name}</p>
              <p className="text-[10px] text-zinc-500 mt-1">Click to replace</p>
            </div>
          ) : (
            <div>
              <Upload className="w-6 h-6 text-zinc-500 mx-auto mb-2" />
              <p className="text-sm text-zinc-400 font-medium">Drop your resume</p>
              <p className="text-xs text-zinc-600 mt-1">PDF, DOC, or DOCX</p>
            </div>
          )}
        </div>

        {/* Paste fallback */}
        {!uploadedFile && (
          <div className="space-y-1.5">
            <p className="text-xs text-zinc-400 font-medium">Or paste resume text</p>
            <textarea
              value={baseResume ?? ""}
              onChange={(e) => setBaseResume(e.target.value || null)}
              placeholder="Paste your resume content here..."
              rows={5}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-blue-500 font-mono leading-relaxed"
            />
          </div>
        )}

        {/* Job selector */}
        <div className="space-y-2">
          <p className="text-xs text-zinc-400 font-medium">Target job</p>
          {savedJobs.length === 0 ? (
            <p className="text-xs text-zinc-600">No saved jobs yet. Discover and save jobs first.</p>
          ) : (
            <div className="space-y-1.5 max-h-52 overflow-y-auto">
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
          disabled={!baseResume || !selectedJobId || streaming}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-auto"
        >
          {streaming ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {streaming ? "Tailoring..." : "Tailor Resume"}
        </Button>
      </div>

      {/* Right panel — diff view */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* View tabs */}
        {tailoredResume && (
          <div className="flex items-center gap-1 p-4 border-b border-zinc-800 bg-zinc-950">
            {(["diff", "original", "tailored"] as const).map((v) => (
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
              <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-700">
                <Download className="w-3 h-3 mr-1.5" />
                Export PDF
              </Button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {/* Streaming state */}
          {streaming && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-blue-400">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <div>
                  <p className="text-sm font-medium">Tailoring your resume for {selectedJob?.company}...</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Rewriting sections, highlighting relevant experience</p>
                </div>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-400 font-mono leading-relaxed whitespace-pre-wrap">{streamText}</p>
                <span className="inline-block w-2 h-3.5 bg-blue-400 animate-pulse ml-0.5 align-middle" />
              </div>
            </div>
          )}

          {/* Empty state */}
          {!streaming && !tailoredResume && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Tailor your resume</h3>
              <p className="text-zinc-400 text-sm max-w-xs">
                Upload your resume and select a job. AI will rewrite it to match the role and show you every change.
              </p>
            </div>
          )}

          {/* Diff view */}
          {tailoredResume && view === "diff" && changes.length > 0 && (
            <div className="space-y-3 animate-fade-in">
              <h3 className="text-sm font-medium text-zinc-300 mb-4">
                {changes.length} changes made for <span className="text-white">{selectedJob?.title} at {selectedJob?.company}</span>
              </h3>
              {changes.map((change, i) => {
                const config = changeTypeConfig[change.type];
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
            </div>
          )}

          {/* Tailored view */}
          {tailoredResume && view === "tailored" && (
            <div className="animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <pre className="text-sm text-zinc-200 whitespace-pre-wrap font-mono leading-relaxed">{tailoredResume}</pre>
              </div>
            </div>
          )}

          {/* Original view */}
          {tailoredResume && view === "original" && baseResume && (
            <div className="animate-fade-in">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <pre className="text-sm text-zinc-400 whitespace-pre-wrap font-mono leading-relaxed">{baseResume}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
