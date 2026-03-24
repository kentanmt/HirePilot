"use client";

import { useState, useEffect, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { FileText, Upload, CheckCircle2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ResumeUpload() {
  const [content, setContent] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => {
        if (d.content) {
          setContent(d.content);
          setFileName(d.fileName);
          setSaved(true);
        }
        setLoaded(true);
      });
  }, []);

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Strip obvious binary garbage from PDFs — keep readable ASCII lines
      const cleaned = text
        .split("\n")
        .filter((line) => /^[\x20-\x7E\t]+$/.test(line) && line.trim().length > 2)
        .join("\n")
        .replace(/\s{3,}/g, "\n")
        .trim();
      setContent(cleaned.length > 100 ? cleaned : text.slice(0, 8000));
      setSaved(false);
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/plain": [".txt"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
    },
    maxFiles: 1,
  });

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, fileName }),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-blue-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-zinc-200">
              {saved ? (fileName ?? "Resume uploaded") : "Upload your resume"}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {saved
                ? "AI will use this to score job matches and tailor applications"
                : "Required for personalized job matching and resume tailoring"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-zinc-800 pt-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors",
              isDragActive ? "border-violet-500 bg-violet-500/10" : "border-zinc-700 hover:border-zinc-600"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="w-5 h-5 text-zinc-500 mx-auto mb-1.5" />
            <p className="text-xs text-zinc-400">
              {fileName ? `Loaded: ${fileName}` : "Drop PDF, DOC, or TXT"}
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">or paste below</p>
          </div>

          {/* Paste area */}
          <textarea
            value={content}
            onChange={(e) => { setContent(e.target.value); setSaved(false); }}
            placeholder="Paste your resume text here..."
            rows={8}
            className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-xs text-zinc-300 placeholder:text-zinc-600 resize-none focus:outline-none focus:border-violet-500 font-mono leading-relaxed"
          />

          <Button
            onClick={handleSave}
            disabled={!content.trim() || saving}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white h-9 text-sm"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> : <CheckCircle2 className="w-3.5 h-3.5 mr-2" />}
            {saving ? "Saving..." : saved ? "Update Resume" : "Save Resume"}
          </Button>
        </div>
      )}
    </div>
  );
}
