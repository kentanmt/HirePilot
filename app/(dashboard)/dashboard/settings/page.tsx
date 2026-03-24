"use client";

import { useState, useEffect } from "react";
import { Settings, Save, Loader2, User, Target, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

const SENIORITY_LEVELS = ["junior", "mid", "senior", "lead", "principal", "director"];

export default function SettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    targetRole: "",
    seniority: "",
    bio: "",
    linkedinUrl: "",
    githubUrl: "",
    targetLocations: "",
    targetCompanies: "",
    skills: "",
    yearsExperience: "",
  });

  useEffect(() => {
    fetch("/api/profile").then((r) => r.json()).then((data) => {
      if (data) {
        setForm({
          targetRole: data.targetRole ?? "",
          seniority: data.seniority ?? "",
          bio: data.bio ?? "",
          linkedinUrl: data.linkedinUrl ?? "",
          githubUrl: data.githubUrl ?? "",
          targetLocations: (data.targetLocations ?? []).join(", "),
          targetCompanies: (data.targetCompanies ?? []).join(", "),
          skills: (data.skills ?? []).join(", "),
          yearsExperience: data.yearsExperience?.toString() ?? "",
        });
      }
    });
  }, []);

  async function handleSave() {
    setLoading(true);
    try {
      await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: form.targetRole,
          seniority: form.seniority,
          bio: form.bio,
          linkedinUrl: form.linkedinUrl,
          githubUrl: form.githubUrl,
          targetLocations: form.targetLocations.split(",").map((s) => s.trim()).filter(Boolean),
          targetCompanies: form.targetCompanies.split(",").map((s) => s.trim()).filter(Boolean),
          skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
          yearsExperience: form.yearsExperience ? parseInt(form.yearsExperience) : null,
        }),
      });
      toast({ title: "Settings saved", description: "Your profile has been updated." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-zinc-400" />
          Settings
        </h1>
        <p className="text-zinc-400 text-sm mt-1">Update your profile — this improves all AI recommendations</p>
      </div>

      <div className="space-y-6">
        {/* Career section */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Target className="w-4 h-4 text-violet-400" />
            Career Target
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Target Role</Label>
              <Input value={form.targetRole} onChange={(e) => setForm((p) => ({ ...p, targetRole: e.target.value }))} className="bg-zinc-800 border-zinc-700 h-9 text-sm" placeholder="Senior Software Engineer" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Years of Experience</Label>
              <Input value={form.yearsExperience} onChange={(e) => setForm((p) => ({ ...p, yearsExperience: e.target.value }))} className="bg-zinc-800 border-zinc-700 h-9 text-sm" type="number" placeholder="5" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Seniority</Label>
            <div className="flex flex-wrap gap-2">
              {SENIORITY_LEVELS.map((s) => (
                <button key={s} onClick={() => setForm((p) => ({ ...p, seniority: s }))} className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors capitalize ${form.seniority === s ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "border-zinc-700 text-zinc-500 hover:text-zinc-300"}`}>{s}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Target Locations (comma separated)</Label>
            <Input value={form.targetLocations} onChange={(e) => setForm((p) => ({ ...p, targetLocations: e.target.value }))} className="bg-zinc-800 border-zinc-700 h-9 text-sm" placeholder="San Francisco, CA, Remote, New York" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Target Companies (comma separated)</Label>
            <Input value={form.targetCompanies} onChange={(e) => setForm((p) => ({ ...p, targetCompanies: e.target.value }))} className="bg-zinc-800 border-zinc-700 h-9 text-sm" placeholder="Stripe, Linear, Vercel, Anthropic" />
          </div>
        </div>

        {/* Skills */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-400" />
            Skills
          </h2>
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Top Skills (comma separated)</Label>
            <Input value={form.skills} onChange={(e) => setForm((p) => ({ ...p, skills: e.target.value }))} className="bg-zinc-800 border-zinc-700 h-9 text-sm" placeholder="TypeScript, React, Node.js, PostgreSQL" />
          </div>
        </div>

        {/* Profile */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400" />
            Profile Links
          </h2>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">Bio</Label>
              <Textarea value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} className="bg-zinc-800 border-zinc-700 text-sm min-h-[80px]" placeholder="Brief professional bio..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">LinkedIn URL</Label>
              <Input value={form.linkedinUrl} onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))} className="bg-zinc-800 border-zinc-700 h-9 text-sm" placeholder="https://linkedin.com/in/..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-zinc-400 text-xs">GitHub URL</Label>
              <Input value={form.githubUrl} onChange={(e) => setForm((p) => ({ ...p, githubUrl: e.target.value }))} className="bg-zinc-800 border-zinc-700 h-9 text-sm" placeholder="https://github.com/..." />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full bg-violet-600 hover:bg-violet-700 text-white h-10">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
