import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, FAST_MODEL } from "@/lib/anthropic";

// Analyze resume with Claude and return extracted profile info
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resumeText } = await req.json();
  if (!resumeText?.trim()) return NextResponse.json({ error: "No resume text" }, { status: 400 });

  try {
    const response = await anthropic.messages.create({
      model: FAST_MODEL,
      max_tokens: 800,
      messages: [{
        role: "user",
        content: `Analyze this resume and extract structured profile information.

RESUME:
${resumeText.slice(0, 3000)}

Return ONLY a valid JSON object (no markdown):
{
  "targetRole": "most recent or desired job title",
  "seniority": "Junior|Mid-level|Senior|Lead|Principal|Director",
  "yearsExperience": number,
  "skills": ["skill1", "skill2", ... up to 10 most relevant technical skills],
  "location": "city, state or Remote",
  "targetCompanies": ["company1", "company2", ... up to 5 companies this person would target based on background],
  "summary": "2 sentence career summary"
}`,
      }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const profile = match ? JSON.parse(match[0]) : {};

    return NextResponse.json({ profile });
  } catch (err) {
    console.error("[onboarding analyze]", err);
    return NextResponse.json({ profile: {} });
  }
}

// Save completed profile + resume
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { resumeText, fileName, targetRole, seniority, yearsExperience, skills, location, targetCompanies } = await req.json();

  // Save/update profile
  const existing = await prisma.userProfile.findUnique({ where: { userId: session.user.id } });
  const profileData = {
    targetRole: targetRole || null,
    seniority: seniority || "Senior",
    yearsExperience: yearsExperience ? Number(yearsExperience) : null,
    skills: JSON.stringify(Array.isArray(skills) ? skills : []),
    location: location || null,
    targetCompanies: JSON.stringify(Array.isArray(targetCompanies) ? targetCompanies : []),
  };

  if (existing) {
    await prisma.userProfile.update({ where: { userId: session.user.id }, data: profileData });
  } else {
    await prisma.userProfile.create({ data: { userId: session.user.id, ...profileData } });
  }

  // Save resume
  if (resumeText?.trim()) {
    const existingResume = await prisma.resume.findFirst({ where: { userId: session.user.id, isBase: true } });
    if (existingResume) {
      await prisma.resume.update({ where: { id: existingResume.id }, data: { content: resumeText, fileName: fileName || "resume" } });
    } else {
      await prisma.resume.create({ data: { userId: session.user.id, content: resumeText, fileName: fileName || "resume", isBase: true, version: 1 } });
    }
  }

  return NextResponse.json({ ok: true });
}
