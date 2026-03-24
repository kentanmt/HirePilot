import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL, SYSTEM_PROMPT, createStreamingResponse } from "@/lib/anthropic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId, resumeContent } = await req.json();

  const job = await prisma.job.findFirst({ where: { id: jobId, userId: session.user.id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const prompt = `You are an expert resume writer and career coach. Tailor the following resume for the target job.

TARGET JOB:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description || "Not provided"}
Requirements: ${Array.isArray(job.requirements) ? job.requirements.join(", ") : job.requirements}

CURRENT RESUME:
${resumeContent}

Instructions:
1. Rewrite the resume to strongly match the job description
2. Highlight relevant skills and reorder sections for maximum impact
3. Use keywords from the job description for ATS optimization
4. Strengthen bullet points with specific impact and metrics
5. Adjust the summary/objective to target this specific role

Return a JSON object with this structure:
{
  "tailored": "Full rewritten resume text here...",
  "changes": [
    {
      "type": "modified|added|removed|reordered",
      "section": "Which section was changed",
      "description": "What was changed and why"
    }
  ]
}

Return ONLY valid JSON.`;

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 6000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return createStreamingResponse(stream);
}
