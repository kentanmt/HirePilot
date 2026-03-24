import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL, SYSTEM_PROMPT, createStreamingResponse } from "@/lib/anthropic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();

  const job = await prisma.job.findFirst({ where: { id: jobId, userId: session.user.id } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const prompt = `Generate a comprehensive set of 12 interview questions for this role:

Title: ${job.title}
Company: ${job.company}
Requirements: ${job.requirements.join(", ")}
Description: ${job.description ?? "Not provided"}

Generate a mix:
- 4 behavioral questions (BEHAVIORAL)
- 3 technical questions (TECHNICAL)
- 3 role-specific questions (ROLE_SPECIFIC)
- 2 culture fit questions (CULTURE_FIT)

Return ONLY a valid JSON array:
[
  {
    "type": "BEHAVIORAL|TECHNICAL|ROLE_SPECIFIC|CULTURE_FIT",
    "question": "The full question text",
    "tips": ["tip1", "tip2"]
  }
]

Make questions specific to ${job.company}'s known culture, tech stack, and this specific role. Return ONLY the JSON array.`;

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return createStreamingResponse(stream);
}
