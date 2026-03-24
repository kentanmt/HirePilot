import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL } from "@/lib/anthropic";
import { fetchAllJobs } from "@/lib/jobSources";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { role, location, seniority, jobType } = await req.json();
  const [profile, baseResume] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: session.user.id } }),
    prisma.resume.findFirst({ where: { userId: session.user.id, isBase: true } }),
  ]);

  const parseArr = (v: any) => { try { return Array.isArray(v) ? v : JSON.parse(v ?? "[]"); } catch { return []; } };
  const skills: string[] = parseArr(profile?.skills);
  const targetCompanies: string[] = parseArr(profile?.targetCompanies);

  // Fetch real jobs from all free sources in parallel
  const realJobs = await fetchAllJobs(role, location ?? "", seniority ?? "Senior");

  let resultJson = "[]";

  if (realJobs.length > 0) {
    // Score real jobs with Claude
    const jobsContext = realJobs.map((j, i) =>
      `[${i}] ${j.title} @ ${j.company} | ${j.location} | ${j.remote ? "Remote" : "On-site"} | Source: ${j.source}\nDescription: ${j.description.slice(0, 250)}\nRequirements: ${j.requirements.join(", ") || "not listed"}\nURL: ${j.url}`
    ).join("\n\n");

    const resumeSnippet = baseResume?.content
      ? `\nResume excerpt:\n${baseResume.content.slice(0, 1200)}`
      : "";

    const prompt = `You are a job match expert. Score and rank these REAL job listings for this candidate.

Candidate:
- Target role: ${role}
- Seniority: ${seniority}
- Location: ${location || "open to anything"}
- Skills: ${skills.join(", ") || "not specified"}
- Experience: ${profile?.yearsExperience ?? "?"} years
- Target companies: ${targetCompanies.join(", ") || "open"}${resumeSnippet}

Job listings:
${jobsContext}

Return ONLY a valid JSON array (no markdown, no code blocks). Each item:
{ "title": "", "company": "", "location": "", "remote": bool, "description": "2 sentences", "requirements": ["skill1","skill2"], "url": "", "source": "", "salaryMin": null, "salaryMax": null, "matchScore": 0-100, "matchReason": "1-2 sentences" }

Include all jobs with matchScore >= 30. Sort descending by matchScore. The "matchReason" should reference specific skills or experience from the candidate's resume if provided. Return ONLY the JSON array.`;

    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const match = text.match(/\[[\s\S]*\]/);
      resultJson = match ? match[0] : "[]";
    } catch (err) {
      console.error("Claude scoring error:", err);
      // Return raw jobs without AI scoring
      resultJson = JSON.stringify(realJobs.slice(0, 10).map((j, i) => ({
        ...j, matchScore: 70 - i * 2, matchReason: "Fetched from " + j.source,
      })));
    }
  } else {
    // No real jobs found — generate with Claude
    const prompt = `Generate 8 realistic job listings for a ${seniority} ${role}${location ? " in " + location : ""}.
User skills: ${skills.join(", ") || "TypeScript, React, Node.js"}.
Target companies: ${targetCompanies.join(", ") || "top startups"}.

Return ONLY a valid JSON array (no markdown, no code blocks):
[{ "title": "", "company": "", "location": "", "remote": bool, "salaryMin": 120000, "salaryMax": 180000, "description": "2-3 sentences", "requirements": ["skill1","skill2","skill3"], "url": null, "source": "AI Generated", "matchScore": 60-98, "matchReason": "why this fits" }]

Use realistic companies (YC-backed startups, FAANG, growth-stage). Sort by matchScore desc. Return ONLY the JSON array.`;

    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const match = text.match(/\[[\s\S]*\]/);
      resultJson = match ? match[0] : "[]";
    } catch (err) {
      console.error("Claude generation error:", err);
      resultJson = "[]";
    }
  }

  return new Response(resultJson, {
    headers: { "Content-Type": "application/json" },
  });
}
