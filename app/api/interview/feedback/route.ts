import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { anthropic, MODEL, SYSTEM_PROMPT, createStreamingResponse } from "@/lib/anthropic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { question, answer, type } = await req.json();

  const prompt = `You are an expert interview coach. Evaluate this interview answer and provide detailed coaching feedback.

Question Type: ${type}
Question: ${question}
Candidate's Answer: ${answer}

Provide:
1. A score from 1-10
2. Specific feedback on what they did well and what needs improvement
3. 2-3 actionable coaching tips

For BEHAVIORAL questions, evaluate STAR structure (Situation, Task, Action, Result).
For TECHNICAL questions, evaluate correctness, depth, and communication clarity.
For ROLE_SPECIFIC, evaluate relevance and domain expertise demonstrated.

Return ONLY valid JSON:
{
  "score": 8,
  "feedback": "Detailed 2-3 paragraph feedback...",
  "tips": [
    "Specific actionable tip 1",
    "Specific actionable tip 2"
  ]
}`;

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 1000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return createStreamingResponse(stream);
}
