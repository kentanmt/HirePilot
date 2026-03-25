import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL, SYSTEM_PROMPT } from "@/lib/anthropic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!process.env.GOOGLE_AI_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_AI_API_KEY is not configured. Add it in Railway Variables." }, { status: 500 });
  }

  const { jobId, resumeContent } = await req.json();

  if (!resumeContent?.trim()) {
    return NextResponse.json({ error: "No resume content provided" }, { status: 400 });
  }

  const job = await prisma.job.findFirst({ where: { id: jobId, userId: session.user.id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const requirements = Array.isArray(job.requirements)
    ? job.requirements.join(", ")
    : (job.requirements as string) ?? "Not listed";

  const prompt = `You are an expert resume writer. Tailor the resume below for this specific job. Be thorough and specific.

TARGET JOB:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description || "Not provided"}
Requirements: ${requirements}

CURRENT RESUME:
${resumeContent}

Instructions:
1. Rewrite the resume to strongly match the job description and requirements
2. Highlight relevant skills and reorder sections for maximum impact
3. Use exact keywords from the job description for ATS optimization
4. Strengthen bullet points with specific impact and metrics where possible
5. Adjust the summary/objective to target this specific role and company

Return a JSON object — no markdown fences, no explanation, ONLY the JSON:
{
  "tailored": "Full rewritten resume text here (keep it comprehensive and professional)...",
  "changes": [
    {
      "type": "modified",
      "section": "Summary",
      "description": "Rewrote to emphasize X for this role"
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    // Strip markdown fences if Claude wrapped it
    const stripped = raw
      .replace(/^```(?:json)?\s*/im, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    // Extract the outermost JSON object
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Claude gave us plain text — wrap it
      return NextResponse.json({ tailored: raw.trim(), changes: [] });
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        tailored: parsed.tailored ?? raw.trim(),
        changes: Array.isArray(parsed.changes) ? parsed.changes : [],
      });
    } catch {
      return NextResponse.json({ tailored: raw.trim(), changes: [] });
    }
  } catch (err: any) {
    console.error("Tailor Claude error:", err?.message ?? err);
    const msg: string = err?.message ?? "";
    const friendly = msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")
      ? "Gemini API quota exceeded. Wait a minute and try again (free tier: 15 req/min)."
      : msg.includes("API key") || msg.includes("API_KEY")
      ? "Invalid API key. Check GOOGLE_AI_API_KEY in Railway Variables."
      : msg || "Failed to tailor resume. Please try again.";
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
