import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anthropic, MODEL, SYSTEM_PROMPT, createStreamingResponse } from "@/lib/anthropic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    include: {
      job: {
        select: { id: true, title: true, company: true, location: true, remote: true, salaryMin: true, salaryMax: true, matchScore: true, url: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jobId } = await req.json();

  const job = await prisma.job.findFirst({
    where: { id: jobId, userId: session.user.id },
  });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const profile = await prisma.userProfile.findUnique({ where: { userId: session.user.id } });
  const baseResume = await prisma.resume.findFirst({ where: { userId: session.user.id, isBase: true } });

  const prompt = `You are an expert job application assistant. Generate a detailed, step-by-step auto-application walkthrough for this job.

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location ?? "Remote"}
- Description: ${job.description ?? "Not provided"}
- Requirements: ${Array.isArray(job.requirements) ? job.requirements.join(", ") : job.requirements}

APPLICANT PROFILE:
- Target Role: ${profile?.targetRole ?? "Not specified"}
- Seniority: ${profile?.seniority ?? "Not specified"}
- Skills: ${Array.isArray(profile?.skills) ? profile.skills.join(", ") : (typeof profile?.skills === "string" ? JSON.parse(profile.skills || "[]").join(", ") : "Not specified")}
- Years of Experience: ${profile?.yearsExperience ?? "Not specified"}

Provide a live, step-by-step walkthrough as if filling out the application in real time:

1. Navigation: Finding the application on the company's website
2. Personal Information: Filling basic info fields
3. Resume Upload: Which resume version to use and why
4. Cover Letter: A tailored 3-paragraph cover letter
5. Work Experience: Key experiences to highlight
6. Skills & Questions: Suggested answers to common application questions
7. Submission: Final checklist before submitting

Write this as a real-time narrative, first person, present tense. Be specific to the company and role.`;

  // Update application status to IN_PROGRESS
  await prisma.application.updateMany({
    where: { userId: session.user.id, jobId },
    data: { status: "IN_PROGRESS" },
  });

  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  });

  // After stream, update to APPLIED (we do this async, stream continues)
  stream.on("finalMessage", async () => {
    await prisma.application.updateMany({
      where: { userId: session.user.id, jobId },
      data: {
        status: "APPLIED",
        appliedAt: new Date(),
        aiGenerated: true,
      },
    });
  });

  return createStreamingResponse(stream);
}
