import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { anthropic, MODEL, SYSTEM_PROMPT, createStreamingResponse } from "@/lib/anthropic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { contact, targetRole } = await req.json();

  const prompt = `Write a personalized, genuine outreach message to ${contact.name} (${contact.title} at ${contact.company}) for someone seeking a ${targetRole || "software engineering"} role.

Guidelines:
- Keep it under 200 words — concise is better
- Be specific about why you're reaching out to THIS person
- Show you know something about ${contact.company}
- Make a specific, low-friction ask (not "can you refer me" — more like "would love to chat for 15 minutes")
- Sound human, not templated
- For LinkedIn: conversational, warm tone
- Don't use subject lines (this is a LinkedIn message)

Write only the message body. No greeting format needed beyond "Hi ${contact.name.split(" ")[0]}," — just the message.`;

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  return createStreamingResponse(stream);
}
