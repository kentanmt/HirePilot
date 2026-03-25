"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import {
  Sparkles, ArrowRight, ArrowLeft, Check, Loader2,
  MapPin, Briefcase, Upload, CheckCircle2, FileText, X, AlertCircle,
} from "lucide-react";
import { readResumeFile } from "@/lib/pdfReader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const SENIORITY_LEVELS = [
  { value: "Junior", label: "Junior", desc: "0–2 years" },
  { value: "Mid-level", label: "Mid-level", desc: "2–5 years" },
  { value: "Senior", label: "Senior", desc: "5–8 years" },
  { value: "Lead", label: "Lead", desc: "7–10 years" },
  { value: "Principal", label: "Principal", desc: "10+ years" },
  { value: "Director", label: "Director+", desc: "Management" },
];

const POPULAR_COMPANIES = ["Google", "Meta", "Stripe", "Airbnb", "Notion", "Linear", "Vercel", "Anthropic", "OpenAI", "Figma"];
const POPULAR_SKILLS = ["TypeScript", "React", "Node.js", "Python", "Go", "PostgreSQL", "AWS", "Docker", "GraphQL", "Rust"];

// Step 0: Resume upload, Steps 1–4: profile fields
const STEPS = ["Resume", "Role", "Experience", "Location & Companies", "Skills"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Resume
  const [resumeText, setResumeText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState("");

  // Profile form
  const [form, setForm] = useState({
    targetRole: "",
    seniority: "Senior",
    yearsExperience: "",
    targetCompanies: [] as string[],
    companyInput: "",
    skills: [] as string[],
    skillInput: "",
    location: "",
  });

  const onDrop = useCallback(async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileError(null);
    setFileLoading(true);
    try {
      const text = await readResumeFile(file);
      if (!text || text.trim().length < 50) {
        setFileError("Couldn't extract text. Try a different file or paste your resume below.");
        return;
      }
      setFileName(file.name);
      setResumeText(text);
    } finally {
      setFileLoading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  });

  async function handleAnalyzeAndContinue() {
    if (!resumeText.trim()) { setStep(1); return; }
    setAnalyzing(true);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText }),
      });
      const data = await res.json();
      const p = data.profile || {};
      setForm((prev) => ({
        ...prev,
        targetRole: p.targetRole || prev.targetRole,
        seniority: SENIORITY_LEVELS.find((l) => l.value === p.seniority) ? p.seniority : prev.seniority,
        yearsExperience: p.yearsExperience ? String(p.yearsExperience) : prev.yearsExperience,
        skills: p.skills?.length ? p.skills.slice(0, 10) : prev.skills,
        location: p.location || prev.location,
        targetCompanies: p.targetCompanies?.length ? p.targetCompanies.slice(0, 5) : prev.targetCompanies,
      }));
      if (p.summary) setAiSummary(p.summary);
    } finally {
      setAnalyzing(false);
      setStep(1);
    }
  }

  function addTag(field: "targetCompanies" | "skills", value: string) {
    if (!value.trim()) return;
    if (!form[field].includes(value.trim())) {
      setForm((p) => ({ ...p, [field]: [...p[field], value.trim()] }));
    }
    setForm((p) => ({ ...p, [field === "targetCompanies" ? "companyInput" : "skillInput"]: "" }));
  }

  function removeTag(field: "targetCompanies" | "skills", value: string) {
    setForm((p) => ({ ...p, [field]: p[field].filter((v) => v !== value) }));
  }

  async function handleFinish() {
    setSaving(true);
    try {
      // Save profile
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: form.targetRole,
          seniority: form.seniority,
          yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : null,
          targetCompanies: JSON.stringify(form.targetCompanies),
          skills: JSON.stringify(form.skills),
          location: form.location,
          onboardingDone: true,
        }),
      });
      // Save resume if provided
      if (resumeText.trim()) {
        await fetch("/api/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: resumeText, fileName: fileName || "resume" }),
        });
      }
      router.push("/dashboard");
    } finally {
      setSaving(false);
    }
  }

  const canContinue = [
    true, // resume step always skippable
    form.targetRole.length > 0,
    form.seniority.length > 0,
    true,
    true,
  ][step];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-violet-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg text-white">Copilot</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Set up your search</h1>
          <p className="text-zinc-400 text-sm mt-1">Takes about 2 minutes</p>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1.5 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 h-1 rounded-full overflow-hidden bg-zinc-800">
              <div className={cn("h-full rounded-full transition-all duration-500", i <= step ? "bg-violet-500" : "")} />
            </div>
          ))}
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6">

          {/* ── Step 0: Resume Upload ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-violet-400" />
                  Upload your resume
                </h2>
                <p className="text-zinc-400 text-sm mt-1">
                  AI will analyze it to auto-fill your profile. You can edit everything after.
                </p>
              </div>

              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-colors",
                  isDragActive ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-zinc-600",
                  fileName && "border-emerald-600 bg-emerald-500/5"
                )}
              >
                <input {...getInputProps()} />
                {fileLoading ? (
                  <div>
                    <Loader2 className="w-7 h-7 text-violet-400 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-zinc-400">Extracting text from PDF...</p>
                  </div>
                ) : fileName ? (
                  <div>
                    <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-emerald-400">{fileName}</p>
                    <p className="text-xs text-zinc-500 mt-1">Click to replace</p>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-7 h-7 text-zinc-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-zinc-200">Drop resume here</p>
                    <p className="text-xs text-zinc-500 mt-1">PDF or .txt — or paste below</p>
                  </div>
                )}
              </div>

              {fileError && (
                <p className="text-xs text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {fileError}
                </p>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-zinc-800" /></div>
                <div className="relative flex justify-center"><span className="bg-zinc-900 px-3 text-xs text-zinc-500">or paste resume text</span></div>
              </div>

              <textarea
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your resume content here..."
                rows={6}
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-violet-500 font-mono leading-relaxed"
              />
            </div>
          )}

          {/* ── Step 1: Target Role ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-violet-400" />
                  What role are you targeting?
                </h2>
                {aiSummary && (
                  <div className="mt-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-xs text-violet-300">{aiSummary}</p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">Target role</Label>
                <Input
                  value={form.targetRole}
                  onChange={(e) => setForm((p) => ({ ...p, targetRole: e.target.value }))}
                  placeholder="e.g. Senior Software Engineer"
                  className="bg-zinc-800 border-zinc-700 focus:border-violet-500 h-11"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">Years of experience</Label>
                <Input
                  value={form.yearsExperience}
                  onChange={(e) => setForm((p) => ({ ...p, yearsExperience: e.target.value }))}
                  placeholder="e.g. 5"
                  type="number"
                  min={0}
                  max={40}
                  className="bg-zinc-800 border-zinc-700 focus:border-violet-500 h-11"
                />
              </div>
            </div>
          )}

          {/* ── Step 2: Seniority ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">What&apos;s your seniority level?</h2>
                <p className="text-zinc-400 text-sm mt-1">Affects job matching and resume positioning.</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SENIORITY_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    onClick={() => setForm((p) => ({ ...p, seniority: level.value }))}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-xl border text-left transition-all",
                      form.seniority === level.value
                        ? "border-violet-500 bg-violet-500/10 text-violet-300"
                        : "border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-medium text-sm">{level.label}</span>
                      {form.seniority === level.value && <Check className="w-4 h-4 text-violet-400" />}
                    </div>
                    <span className="text-xs text-zinc-500">{level.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Step 3: Location & Companies ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-emerald-400" />
                  Location & target companies
                </h2>
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300 text-sm">Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="e.g. San Francisco, CA or Remote"
                  className="bg-zinc-800 border-zinc-700 focus:border-violet-500 h-10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300 text-sm">Target companies</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.companyInput}
                    onChange={(e) => setForm((p) => ({ ...p, companyInput: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("targetCompanies", form.companyInput))}
                    placeholder="Type a company name..."
                    className="bg-zinc-800 border-zinc-700 focus:border-violet-500 h-9 text-sm"
                  />
                  <Button variant="secondary" onClick={() => addTag("targetCompanies", form.companyInput)} size="sm" className="h-9">Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_COMPANIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => addTag("targetCompanies", c)}
                      className={cn(
                        "px-2 py-1 rounded-md text-xs border transition-colors",
                        form.targetCompanies.includes(c)
                          ? "bg-violet-500/10 border-violet-500/20 text-violet-300"
                          : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                {form.targetCompanies.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {form.targetCompanies.map((c) => (
                      <span
                        key={c}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-xs"
                      >
                        {c}
                        <button onClick={() => removeTag("targetCompanies", c)}>
                          <X className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Skills ── */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-white">Your top skills</h2>
                <p className="text-zinc-400 text-sm mt-1">Used to score matches and tailor your resume.</p>
              </div>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={form.skillInput}
                    onChange={(e) => setForm((p) => ({ ...p, skillInput: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("skills", form.skillInput))}
                    placeholder="Add a skill..."
                    className="bg-zinc-800 border-zinc-700 focus:border-violet-500 h-9 text-sm"
                    autoFocus
                  />
                  <Button variant="secondary" onClick={() => addTag("skills", form.skillInput)} size="sm" className="h-9">Add</Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_SKILLS.map((s) => (
                    <button
                      key={s}
                      onClick={() => addTag("skills", s)}
                      className={cn(
                        "px-2 py-1 rounded-md text-xs border transition-colors",
                        form.skills.includes(s)
                          ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                          : "border-zinc-700 text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                {form.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {form.skills.map((s) => (
                      <span
                        key={s}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs"
                      >
                        {s}
                        <button onClick={() => removeTag("skills", s)}>
                          <X className="w-2.5 h-2.5 opacity-70 hover:opacity-100" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className={cn("flex gap-3 mt-6", step > 0 ? "justify-between" : "justify-end")}>
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep((s) => s - 1)} className="text-zinc-400">
                <ArrowLeft className="w-4 h-4 mr-2" />Back
              </Button>
            )}

            {step === 0 ? (
              <Button
                onClick={handleAnalyzeAndContinue}
                disabled={analyzing}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                {analyzing ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Analyzing...</>
                ) : resumeText.trim() ? (
                  <><Sparkles className="w-4 h-4 mr-2" />Analyze & Continue</>
                ) : (
                  <>Skip <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            ) : step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => s + 1)}
                disabled={!canContinue}
                className="bg-violet-600 hover:bg-violet-700 text-white"
              >
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-700 text-white px-8"
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Setting up...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />Launch Copilot</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
