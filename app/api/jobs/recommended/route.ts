import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, FAST_MODEL } from "@/lib/anthropic";

function parseArr(v: any): string[] {
  try { return Array.isArray(v) ? v : JSON.parse(v ?? "[]"); } catch { return []; }
}

async function generateRecommendations(userId: string) {
  const [profile, resume] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId } }),
    prisma.resume.findFirst({ where: { userId, isBase: true } }),
  ]);

  if (!profile && !resume) return null;

  const skills = parseArr(profile?.skills);
  const targetCompanies = parseArr(profile?.targetCompanies);
  const resumeSnippet = resume?.content ? resume.content.slice(0, 1800) : "";

  const prompt = `You are a senior technical recruiter. Based on this candidate's resume and profile, generate 6 highly targeted job recommendations they would be a strong fit for.

CANDIDATE PROFILE:
- Target role: ${profile?.targetRole || "Software Engineer"}
- Seniority: ${profile?.seniority || "Mid-level"}
- Location preference: ${profile?.location || "Remote"}
- Years of experience: ${profile?.yearsExperience ?? "?"}
- Skills: ${skills.join(", ") || "not listed"}
- Target companies: ${targetCompanies.join(", ") || "top tech companies"}${resumeSnippet ? `\n\nRESUME CONTENT:\n${resumeSnippet}` : ""}

Generate 4 specific, realistic job listings this candidate would excel at. Use real company names.

Return ONLY a valid JSON array — no markdown, no code blocks, no explanation:
[{
  "title": "exact job title",
  "company": "real company name",
  "location": "City, State or Remote",
  "remote": true,
  "salaryMin": 130000,
  "salaryMax": 190000,
  "description": "2 sentences about the role",
  "requirements": ["Skill 1", "Skill 2", "Skill 3"],
  "url": null,
  "source": "HirePilot AI",
  "matchScore": 80,
  "matchReason": "1 sentence referencing their specific skills or experience"
}]

Rules: matchScore 70-99, sort by matchScore desc, ONLY the JSON array.`;

  const response = await anthropic.messages.create({
    model: FAST_MODEL,
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  // Strip markdown fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/im, "").replace(/\s*```\s*$/m, "").trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return [];

  return JSON.parse(match[0]) as any[];
}

// GET — return cached recommendations or generate fresh ones
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // Check for recommendations fresher than 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const cached = (await prisma.job.findMany({
    where: { userId, isRecommended: true },
    orderBy: { createdAt: "desc" },
    take: 6,
  })).filter((j: any) => j.recommendedAt && j.recommendedAt > cutoff);

  if (cached.length >= 4) {
    return NextResponse.json({ jobs: cached, fresh: false });
  }

  // Generate fresh recommendations
  try {
    const jobs = await generateRecommendations(userId);
    if (!jobs) return NextResponse.json({ jobs: [], reason: "no_profile" });

    // Remove stale unsaved recommendations
    await prisma.job.deleteMany({ where: { userId, isRecommended: true, isSaved: false } });

    const now = new Date().toISOString();
    const saved = [];
    for (const job of jobs.slice(0, 6)) {
      const rec = await prisma.job.create({
        data: {
          userId,
          title: job.title ?? "Untitled",
          company: job.company ?? "Unknown",
          location: job.location ?? null,
          remote: job.remote ?? false,
          salaryMin: typeof job.salaryMin === "number" ? job.salaryMin : null,
          salaryMax: typeof job.salaryMax === "number" ? job.salaryMax : null,
          description: job.description ?? null,
          requirements: Array.isArray(job.requirements) ? job.requirements : [],
          url: job.url ?? null,
          source: job.source ?? "HirePilot AI",
          matchScore: typeof job.matchScore === "number" ? job.matchScore : 75,
          matchReason: job.matchReason ?? null,
          isSaved: false,
          isArchived: false,
          isRecommended: true,
          recommendedAt: now,
        },
      });
      saved.push(rec);
    }

    return NextResponse.json({ jobs: saved, fresh: true });
  } catch (err: any) {
    console.error("Recommendations error:", err?.message ?? err);
    const msg: string = err?.message ?? "";
    const reason = msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") ? "no_credits" : "error";
    return NextResponse.json({ jobs: [], reason });
  }
}

// POST — force refresh (invalidates cache)
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.job.deleteMany({
    where: { userId: session.user.id, isRecommended: true, isSaved: false },
  });

  return NextResponse.json({ ok: true });
}
