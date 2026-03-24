import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { anthropic, MODEL, SYSTEM_PROMPT, createStreamingResponse } from "@/lib/anthropic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();

  const prompt = `A job seeker has the following readiness scores for their job search:

Overall Score: ${data.overallScore}/100
Resume Score: ${data.resumeScore}/100
Application Score: ${data.applicationScore}/100
Network Score: ${data.networkScore}/100
Interview Score: ${data.interviewScore}/100

Current action items they have:
${data.actionItems?.map((item: string, i: number) => `${i + 1}. ${item}`).join("\n")}

Provide 3-4 sentences of personalized, encouraging but honest insights about their job search.
- Identify the biggest opportunity area
- Give one specific, actionable recommendation
- Mention what's going well
- End with encouragement

Be specific, avoid generic advice. Write in second person ("You").`;

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 500,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return createStreamingResponse(stream);
}
