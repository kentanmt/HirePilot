"use client";

import Link from "next/link";
import { ArrowRight, Zap, Target, Brain, Users, Mic, BarChart3, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Target,
    title: "Job Discovery",
    description: "AI scans the market and surfaces curated jobs with a match score explaining exactly why each fits your profile.",
    color: "text-violet-400",
    bg: "bg-violet-500/10",
  },
  {
    icon: Zap,
    title: "Resume Tailor",
    description: "Upload your base resume. For any job, AI rewrites and optimizes it in seconds — with a full diff of every change.",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    icon: ArrowRight,
    title: "Auto-Apply",
    description: "AI fills out application forms intelligently. Track every application with a live status board.",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    icon: Users,
    title: "Network Contacts",
    description: "Identify hiring managers and key contacts at target companies. Get personalized outreach messages ready to send.",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    icon: Mic,
    title: "Interview Prep",
    description: "Generate likely questions for any role. Practice answering, get AI-scored feedback, and coaching tips.",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    icon: BarChart3,
    title: "Readiness Score",
    description: "Track your overall job search health across resume, applications, network, and interview prep — with a daily action plan.",
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
];

const stats = [
  { value: "3×", label: "faster job search" },
  { value: "94%", label: "match accuracy" },
  { value: "2.4×", label: "more interviews" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-violet-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-purple-800/6 rounded-full blur-[100px]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">HirePilot</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">
              Get started free
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm mb-8">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Powered by Claude AI</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6 leading-[1.05]">
            Your AI copilot for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-purple-400">
              landing the job
            </span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            From discovering the right roles to acing the interview — HirePilot guides every step of your job search with AI that actually understands your career.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white px-8 h-12 text-base glow-violet">
                Start your search
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-zinc-700 hover:bg-zinc-800 h-12 text-base px-8">
                Sign in
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-10 mt-16 pt-8 border-t border-zinc-800">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-zinc-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features grid */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className={`w-10 h-10 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <Icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA section */}
        <div className="mt-20 text-center py-16 rounded-3xl bg-gradient-to-br from-violet-600/10 via-purple-600/5 to-transparent border border-violet-500/10">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to supercharge your job search?</h2>
          <p className="text-zinc-400 mb-8">Join thousands of professionals landing roles faster with AI.</p>
          <div className="flex items-center justify-center gap-6 text-sm text-zinc-500 mb-8">
            {["No credit card required", "Set up in 2 minutes", "Cancel anytime"].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                {item}
              </div>
            ))}
          </div>
          <Link href="/register">
            <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white px-10 h-12">
              Get started — it&apos;s free
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
