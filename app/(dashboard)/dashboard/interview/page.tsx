"use client";

import { useState, useEffect } from "react";
import { Mic, Sparkles, Loader2, ChevronLeft, ChevronRight, Star, CheckCircle2, Circle, Brain, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type QuestionType = "BEHAVIORAL" | "TECHNICAL" | "ROLE_SPECIFIC" | "CULTURE_FIT";

interface Question {
  id?: string;
  type: QuestionType;
  question: string;
  answer: string;
  feedback: string;
  score: number | null;
  tips: string[];
  practiced: boolean;
}

interface SavedJob {
  id: string;
  title: string;
  company: string;
}

const TYPE_CONFIG: Record<QuestionType, { label: string; color: string; bg: string }> = {
  BEHAVIORAL: { label: "Behavioral", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  TECHNICAL: { label: "Technical", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  ROLE_SPECIFIC: { label: "Role-Specific", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  CULTURE_FIT: { label: "Culture Fit", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
};

export default function InterviewPrepPage() {
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [generatingQs, setGeneratingQs] = useState(false);
  const [gettingFeedback, setGettingFeedback] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [answerDraft, setAnswerDraft] = useState("");
  const [filterType, setFilterType] = useState<QuestionType | "ALL">("ALL");

  useEffect(() => {
    fetch("/api/jobs/saved").then((r) => r.json()).then((d) => setSavedJobs(d.jobs || []));
  }, []);

  async function handleGenerateQuestions() {
    if (!selectedJobId) return;
    setGeneratingQs(true);
    setStreamText("");
    setQuestions([]);
    setCurrentIndex(0);

    try {
      const res = await fetch("/api/interview/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId }),
      });

      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
        setStreamText(accumulated);
        try {
          const parsed = JSON.parse(accumulated);
          if (Array.isArray(parsed)) {
            setQuestions(parsed.map((q: Partial<Question>) => ({
              ...q,
              answer: "",
              feedback: "",
              score: null,
              tips: q.tips || [],
              practiced: false,
            })));
          }
        } catch { /* accumulating */ }
      }

      try {
        const parsed = JSON.parse(accumulated);
        if (Array.isArray(parsed)) {
          setQuestions(parsed.map((q: Partial<Question>) => ({ ...q, answer: "", feedback: "", score: null, tips: q.tips || [], practiced: false })));
        }
      } catch { /* use stream */ }
    } finally {
      setGeneratingQs(false);
      setStreamText("");
    }
  }

  async function handleGetFeedback() {
    if (!answerDraft.trim() || !questions[currentIndex]) return;
    setGettingFeedback(true);

    const updatedQuestions = [...questions];
    updatedQuestions[currentIndex] = { ...updatedQuestions[currentIndex], answer: answerDraft };
    setQuestions(updatedQuestions);

    try {
      const res = await fetch("/api/interview/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: questions[currentIndex].question,
          answer: answerDraft,
          type: questions[currentIndex].type,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value);
        // Stream feedback directly to question
        setQuestions((prev) => {
          const updated = [...prev];
          updated[currentIndex] = { ...updated[currentIndex], feedback: accumulated };
          return updated;
        });
      }

      // Try parse structured response
      try {
        const parsed = JSON.parse(accumulated);
        setQuestions((prev) => {
          const updated = [...prev];
          updated[currentIndex] = {
            ...updated[currentIndex],
            feedback: parsed.feedback || accumulated,
            score: parsed.score ?? null,
            tips: parsed.tips || [],
            practiced: true,
          };
          return updated;
        });
      } catch {
        setQuestions((prev) => {
          const updated = [...prev];
          updated[currentIndex] = { ...updated[currentIndex], practiced: true };
          return updated;
        });
      }
    } finally {
      setGettingFeedback(false);
    }
  }

  const filtered = filterType === "ALL" ? questions : questions.filter((q) => q.type === filterType);
  const currentQuestion = questions[currentIndex];
  const selectedJob = savedJobs.find((j) => j.id === selectedJobId);
  const practicedCount = questions.filter((q) => q.practiced).length;

  return (
    <div className="h-full flex">
      {/* Left panel */}
      <div className="w-72 shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col">
        <div className="p-5 border-b border-zinc-800">
          <h1 className="text-base font-semibold text-white flex items-center gap-2">
            <Mic className="w-5 h-5 text-amber-400" />
            Interview Prep
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Practice questions with AI coaching</p>
        </div>

        {/* Job selector */}
        <div className="p-4 border-b border-zinc-800">
          <p className="text-xs text-zinc-400 font-medium mb-2">Select job</p>
          <div className="space-y-1.5 max-h-36 overflow-y-auto">
            {savedJobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={cn(
                  "w-full flex items-center gap-2 p-2.5 rounded-xl text-left transition-colors text-xs",
                  selectedJobId === job.id
                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                    : "border border-zinc-800 text-zinc-400 hover:border-zinc-700"
                )}
              >
                <span className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center font-bold text-zinc-500 shrink-0">{job.company[0]}</span>
                <div className="min-w-0">
                  <p className="font-medium truncate">{job.title}</p>
                  <p className="text-zinc-600 truncate">{job.company}</p>
                </div>
              </button>
            ))}
          </div>

          <Button
            onClick={handleGenerateQuestions}
            disabled={!selectedJobId || generatingQs}
            className="w-full mt-3 bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs"
          >
            {generatingQs ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
            {generatingQs ? "Generating..." : "Generate Questions"}
          </Button>
        </div>

        {/* Question list */}
        {questions.length > 0 && (
          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            <div className="flex items-center justify-between px-1 mb-2">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wide">{practicedCount}/{questions.length} practiced</p>
            </div>
            {(["ALL", "BEHAVIORAL", "TECHNICAL", "ROLE_SPECIFIC", "CULTURE_FIT"] as const).map((t) => {
              const count = t === "ALL" ? questions.length : questions.filter((q) => q.type === t).length;
              if (count === 0 && t !== "ALL") return null;
              return (
                <button key={t} onClick={() => setFilterType(t)} className={cn("w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors", filterType === t ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}>
                  {t === "ALL" ? "All" : TYPE_CONFIG[t].label} ({count})
                </button>
              );
            })}

            <div className="space-y-1 mt-2">
              {filtered.map((q, i) => {
                const realIndex = questions.indexOf(q);
                const config = TYPE_CONFIG[q.type];
                return (
                  <button
                    key={i}
                    onClick={() => { setCurrentIndex(realIndex); setAnswerDraft(q.answer || ""); }}
                    className={cn(
                      "w-full flex items-start gap-2 p-2.5 rounded-xl text-left transition-all text-xs",
                      realIndex === currentIndex ? "bg-zinc-800 text-white" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300"
                    )}
                  >
                    {q.practiced
                      ? <CheckCircle2 className={cn("w-3.5 h-3.5 shrink-0 mt-0.5", config.color)} />
                      : <Circle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-zinc-700" />}
                    <span className="line-clamp-2 leading-snug">{q.question}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Practice panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {generatingQs && (
          <div className="p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <Loader2 className="w-4 h-4 animate-spin" />
              <p className="text-sm font-medium">Generating interview questions for {selectedJob?.company}...</p>
            </div>
            {streamText && (
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800">
                <p className="text-xs text-zinc-400 font-mono leading-relaxed">{streamText}</p>
              </div>
            )}
          </div>
        )}

        {questions.length === 0 && !generatingQs && (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Practice makes perfect</h3>
            <p className="text-zinc-400 text-sm max-w-xs">
              Select a job, generate likely interview questions, and practice with real-time AI feedback and coaching.
            </p>
          </div>
        )}

        {currentQuestion && !generatingQs && (
          <div className="flex-1 overflow-y-auto p-6">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className={cn("px-2 py-1 rounded-md text-xs font-medium border", TYPE_CONFIG[currentQuestion.type].bg, TYPE_CONFIG[currentQuestion.type].color)}>
                  {TYPE_CONFIG[currentQuestion.type].label}
                </span>
                <span className="text-xs text-zinc-500">{currentIndex + 1} of {questions.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => { setCurrentIndex((i) => Math.max(0, i - 1)); setAnswerDraft(questions[Math.max(0, currentIndex - 1)]?.answer || ""); }} disabled={currentIndex === 0} className="h-7 w-7">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => { setCurrentIndex((i) => Math.min(questions.length - 1, i + 1)); setAnswerDraft(questions[Math.min(questions.length - 1, currentIndex + 1)]?.answer || ""); }} disabled={currentIndex === questions.length - 1} className="h-7 w-7">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Question */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 mb-4">
              <div className="flex items-start gap-3">
                <MessageSquare className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-white text-base leading-relaxed font-medium">{currentQuestion.question}</p>
              </div>
            </div>

            {/* Answer input */}
            <div className="space-y-3 mb-4">
              <Label className="text-zinc-400 text-sm font-medium">Your answer</Label>
              <Textarea
                value={answerDraft}
                onChange={(e) => setAnswerDraft(e.target.value)}
                placeholder="Type your answer here... Use the STAR method for behavioral questions (Situation, Task, Action, Result)"
                className="bg-zinc-900 border-zinc-800 focus:border-amber-500 min-h-[140px] text-sm leading-relaxed resize-none"
              />
              <Button
                onClick={handleGetFeedback}
                disabled={!answerDraft.trim() || gettingFeedback}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {gettingFeedback ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {gettingFeedback ? "Analyzing..." : "Get AI Feedback"}
              </Button>
            </div>

            {/* Feedback */}
            {currentQuestion.feedback && (
              <div className="bg-zinc-900 border border-amber-500/20 rounded-2xl p-5 animate-fade-in space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Feedback
                  </p>
                  {currentQuestion.score !== null && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <Star key={i} className={cn("w-3 h-3", i < (currentQuestion.score ?? 0) ? "text-amber-400 fill-amber-400" : "text-zinc-700")} />
                      ))}
                      <span className="text-xs text-amber-400 ml-1 font-medium">{currentQuestion.score}/10</span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.feedback}
                  {gettingFeedback && <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-0.5 align-middle" />}
                </p>

                {currentQuestion.tips.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-zinc-400">Coaching tips</p>
                    {currentQuestion.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
