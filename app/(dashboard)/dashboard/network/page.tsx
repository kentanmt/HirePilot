"use client";

import { useState } from "react";
import { Users, Sparkles, Loader2, Linkedin, Mail, Copy, Check, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface Contact {
  name: string;
  title: string;
  company: string;
  platform: "LINKEDIN" | "EMAIL" | "OTHER";
  profileUrl?: string;
  relevance: string;
  outreach?: string;
}

export default function NetworkPage() {
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  async function handleFindContacts() {
    if (!company.trim()) return;
    setLoading(true);
    setStreamText("");
    setContacts([]);
    setSelectedContact(null);

    try {
      const res = await fetch("/api/network/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company, role }),
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
          if (Array.isArray(parsed)) setContacts(parsed);
        } catch { /* accumulating */ }
      }

      try {
        const parsed = JSON.parse(accumulated);
        if (Array.isArray(parsed)) setContacts(parsed);
      } catch { /* use stream text */ }
    } finally {
      setLoading(false);
    }
  }

  async function handleDraftMessage(contact: Contact) {
    setSelectedContact(contact);
    setDraftLoading(true);
    setDraftText("");

    try {
      const res = await fetch("/api/network/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact, targetRole: role }),
      });

      if (!res.ok || !res.body) throw new Error("Failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setDraftText((prev) => prev + decoder.decode(value));
      }
    } finally {
      setDraftLoading(false);
    }
  }

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="h-full flex">
      {/* Left panel */}
      <div className="w-80 shrink-0 border-r border-zinc-800 bg-zinc-950 p-6 flex flex-col gap-5">
        <div>
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Network Contacts
          </h1>
          <p className="text-xs text-zinc-500 mt-1">Find the right people and draft outreach</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Target company</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Stripe, Linear, Vercel"
              className="bg-zinc-900 border-zinc-700 focus:border-emerald-500 h-9 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleFindContacts()}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-zinc-400 text-xs">Your target role (optional)</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              className="bg-zinc-900 border-zinc-700 focus:border-emerald-500 h-9 text-sm"
            />
          </div>
        </div>

        <Button
          onClick={handleFindContacts}
          disabled={loading || !company.trim()}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white mt-auto"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
          {loading ? "Finding..." : "Find Contacts"}
        </Button>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Contact list */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex items-center gap-3 text-emerald-400 mb-4">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <div>
                <p className="text-sm font-medium">Finding contacts at {company}...</p>
                <p className="text-xs text-zinc-500 mt-0.5">Identifying hiring managers, recruiters & team leads</p>
              </div>
            </div>
          )}

          {loading && streamText && (
            <div className="mb-4 p-3 rounded-lg bg-zinc-900 border border-zinc-800">
              <p className="text-xs text-zinc-400 font-mono leading-relaxed">{streamText}</p>
            </div>
          )}

          {!loading && contacts.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Find your network</h3>
              <p className="text-zinc-400 text-sm max-w-xs">
                Enter a target company and AI will surface the best people to reach out to — hiring managers, recruiters, and team members.
              </p>
            </div>
          )}

          {contacts.length > 0 && (
            <div className="space-y-3 max-w-xl">
              <h3 className="text-sm font-medium text-zinc-300 mb-4">
                {contacts.length} contacts found at <span className="text-white">{company}</span>
              </h3>
              {contacts.map((contact, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedContact(contact)}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all animate-fade-in",
                    selectedContact?.name === contact.name
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold text-zinc-400 shrink-0">
                      {contact.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">{contact.name}</p>
                          <p className="text-xs text-zinc-400">{contact.title} · {contact.company}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {contact.platform === "LINKEDIN" && (
                            <span className="p-1 rounded bg-blue-500/10 border border-blue-500/20">
                              <Linkedin className="w-3 h-3 text-blue-400" />
                            </span>
                          )}
                          {contact.platform === "EMAIL" && (
                            <span className="p-1 rounded bg-zinc-800">
                              <Mail className="w-3 h-3 text-zinc-400" />
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">{contact.relevance}</p>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleDraftMessage(contact); }}
                        className="mt-2 h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        Draft message
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message draft panel */}
        {selectedContact && (
          <div className="w-96 border-l border-zinc-800 bg-zinc-950 flex flex-col">
            <div className="p-4 border-b border-zinc-800">
              <p className="text-sm font-medium text-white">Message to {selectedContact.name}</p>
              <p className="text-xs text-zinc-500">{selectedContact.platform === "LINKEDIN" ? "LinkedIn message" : "Email"}</p>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              {draftLoading && !draftText && (
                <div className="flex items-center gap-2 text-emerald-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Drafting personalized message...</span>
                </div>
              )}
              {draftText && (
                <div className="space-y-3">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                    <p className="text-sm text-zinc-200 leading-relaxed whitespace-pre-wrap">
                      {draftText}
                      {draftLoading && <span className="inline-block w-2 h-4 bg-emerald-400 animate-pulse ml-0.5 align-middle" />}
                    </p>
                  </div>
                  {!draftLoading && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => copyToClipboard(draftText, "draft")}
                        variant="outline"
                        className="h-8 text-xs border-zinc-700 flex-1"
                      >
                        {copied === "draft" ? <Check className="w-3 h-3 mr-1 text-emerald-400" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copied === "draft" ? "Copied!" : "Copy"}
                      </Button>
                      {selectedContact.profileUrl && (
                        <a href={selectedContact.profileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                          <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 w-full">
                            <Send className="w-3 h-3 mr-1" />
                            Open LinkedIn
                          </Button>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
