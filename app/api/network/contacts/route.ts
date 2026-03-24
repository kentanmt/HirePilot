import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { anthropic, MODEL, SYSTEM_PROMPT, createStreamingResponse } from "@/lib/anthropic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { company, role } = await req.json();

  const prompt = `You are a recruiting and networking expert. Identify the most relevant people to contact at ${company} for someone targeting a ${role || "software engineering"} role.

Generate 6 realistic contacts including: hiring managers, engineering leaders, recruiters, and team members in the relevant department.

Return ONLY a valid JSON array:
[
  {
    "name": "Full Name",
    "title": "Their exact title",
    "company": "${company}",
    "platform": "LINKEDIN",
    "profileUrl": "https://linkedin.com/in/username",
    "relevance": "2-3 sentences on why this person is relevant and how they could help"
  }
]

Include a mix of seniority levels. Make names, titles and profiles realistic. Return ONLY the JSON array.`;

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return createStreamingResponse(stream);
}
