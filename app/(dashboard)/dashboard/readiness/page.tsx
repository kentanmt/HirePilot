"use client";

import { useState, useEffect } from "react";
import { BarChart3, Sparkles, Loader2, TrendingUp, CheckCircle2, Circle, RefreshCw, FileText, Send, Users, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, getScoreColor } from "@/lib/utils";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";

interface ReadinessData {
  overallScore: number;
  resumeScore: number;
  applicationScore: number;
  networkScore: number;
  interviewScore: number;
  actionItems: string[];
  insights: string | null;
}

const CATEGORIES = [
  { key: "resumeScore" as const, label: "Resume", icon: FileText, color: "#3b82f6", description: "Strength, tailoring, ATS optimization" },
  { key: "applicationScore" as const, label: "Applications", icon: Send, color: "#06b6d4", description: "Volume, quality, follow-up" },
  { key: "networkScore" as const, label: "Network", icon: Users, color: "#10b981", description: "Contacts reached, responses" },
  { key: "interviewScore" as const, label: "Interview Prep", icon: Mic, color: "#f59e0b", description: "Questions practiced, scores" },
];

function ScoreRing({ score, color }: { score: number; color: string }) {
  const data = [{ value: score, fill: color }];
  return (
    <div className="relative w-48 h-48">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%" cy="50%"
          innerRadius="70%" outerRadius="100%"
          barSize={10}
          data={data}
          startAngle={90}
          endAngle={90 - 360 * (score / 100)}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
          <RadialBar background={{ fill: "#27272a" }} dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-white">{score}</span>
        <span className="text-xs text-zinc-500 mt-1">/ 100</span>
      </div>
    </div>
  );
}

export default function ReadinessPage() {
  const [data, setData] = useState<ReadinessData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insightsText, setInsightsText] = useState("");
  const [streamingInsights, setStreamingInsights] = useState(false);

  async function fetchReadiness(refresh = false) {
    if (refresh) setRefreshing(true);
    try {
      const res = await fetch("/api/readiness" + (refresh ? "?refresh=true" : ""));
      const json = await res.json();
      setData(json);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function generateInsights() {
    setStreamingInsights(true);
    setInsightsText("");

    try {
      const res = await fetch("/api/readiness/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setInsightsText((prev) => prev + decoder.decode(value));
      }
    } finally {
      setStreamingInsights(false);
    }
  }

  useEffect(() => { fetchReadiness(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <BarChart3 className="w-12 h-12 text-zinc-700 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No readiness data yet</h3>
        <p className="text-zinc-400 text-sm">Start using Copilot — discover jobs, apply, and practice interviews to build your score.</p>
      </div>
    );
  }

  const overallColor = data.overallScore >= 85 ? "#10b981" : data.overallScore >= 70 ? "#8b5cf6" : data.overallScore >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-rose-400" />
            Job Readiness Score
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Your overall job search health — updated based on your activity</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchReadiness(true)}
          disabled={refreshing}
          className="border-zinc-700 text-zinc-400 hover:text-white h-8"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score ring */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center">
            <p className="text-sm text-zinc-400 font-medium mb-4">Overall Score</p>
            <ScoreRing score={data.overallScore} color={overallColor} />
            <div className="mt-4 text-center">
              <p className={cn("text-lg font-semibold", getScoreColor(data.overallScore))}>
                {data.overallScore >= 85 ? "Excellent" :
                 data.overallScore >= 70 ? "Good" :
                 data.overallScore >= 50 ? "Fair" : "Needs Work"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">job search readiness</p>
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-5">Score Breakdown</h3>
            <div className="space-y-5">
              {CATEGORIES.map((cat) => {
                const score = data[cat.key];
                const Icon = cat.icon;
                return (
                  <div key={cat.key}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" style={{ color: cat.color }} />
                        <span className="text-sm font-medium text-zinc-200">{cat.label}</span>
                        <span className="text-xs text-zinc-600">{cat.description}</span>
                      </div>
                      <span className={cn("text-sm font-bold", getScoreColor(score))}>{score}</span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${score}%`, backgroundColor: cat.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Action plan */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              Prioritized Action Plan
            </h3>
            {data.actionItems.length === 0 ? (
              <p className="text-zinc-500 text-sm">No action items — great job keeping up with your search!</p>
            ) : (
              <ul className="space-y-3">
                {data.actionItems.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold",
                      i === 0 ? "bg-rose-500/20 text-rose-400" :
                      i === 1 ? "bg-amber-500/20 text-amber-400" :
                      "bg-zinc-800 text-zinc-500"
                    )}>
                      {i + 1}
                    </div>
                    <div>
                      <p className="text-sm text-zinc-200 leading-snug">{item}</p>
                      {i === 0 && <span className="text-[10px] text-rose-400 font-medium">High priority</span>}
                      {i === 1 && <span className="text-[10px] text-amber-400 font-medium">Medium priority</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-violet-400" />
                AI Insights
              </h3>
              <Button
                size="sm"
                onClick={generateInsights}
                disabled={streamingInsights}
                className="h-7 text-xs bg-violet-600 hover:bg-violet-700 text-white"
              >
                {streamingInsights ? <Loader2 className="w-3 h-3 animate-spin" /> : "Generate"}
              </Button>
            </div>

            {data.insights && !insightsText && (
              <p className="text-sm text-zinc-400 leading-relaxed">{data.insights}</p>
            )}

            {insightsText && (
              <p className="text-sm text-zinc-400 leading-relaxed">
                {insightsText}
                {streamingInsights && <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse ml-0.5 align-middle" />}
              </p>
            )}

            {!data.insights && !insightsText && !streamingInsights && (
              <p className="text-xs text-zinc-600">Click &quot;Generate&quot; for personalized insights on how to improve your score.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
