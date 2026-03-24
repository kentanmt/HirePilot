import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const { searchParams } = new URL(req.url);
  const refresh = searchParams.get("refresh") === "true";

  if (!refresh) {
    const existing = await prisma.readinessScore.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return NextResponse.json(existing);
  }

  // Compute score from activity
  const [savedJobs, applications, contacts, sessions, questions] = await Promise.all([
    prisma.job.count({ where: { userId, isSaved: true } }),
    prisma.application.findMany({ where: { userId }, select: { status: true } }),
    prisma.contact.count({ where: { userId } }),
    prisma.interviewSession.count({ where: { userId } }),
    prisma.interviewQuestion.findMany({
      where: { session: { userId } },
      select: { practiced: true, score: true },
    }),
  ]);

  const baseResume = await prisma.resume.findFirst({ where: { userId, isBase: true } });
  const tailoredResumes = await prisma.resume.count({ where: { userId, isBase: false } });

  // Resume score (0-100)
  const resumeScore = Math.min(100, Math.round(
    (baseResume ? 50 : 0) + Math.min(50, tailoredResumes * 12)
  ));

  // Application score
  const appliedCount = applications.filter((a) => a.status !== "NOT_STARTED").length;
  const advancedCount = applications.filter((a) => ["PHONE_SCREEN", "INTERVIEW", "FINAL_ROUND", "OFFER"].includes(a.status)).length;
  const applicationScore = Math.min(100, Math.round(
    Math.min(40, appliedCount * 8) + Math.min(40, advancedCount * 15) + Math.min(20, savedJobs * 4)
  ));

  // Network score
  const sentContacts = await prisma.contact.count({ where: { userId, sentAt: { not: null } } });
  const respondedContacts = await prisma.contact.count({ where: { userId, responded: true } });
  const networkScore = Math.min(100, Math.round(
    Math.min(40, contacts * 8) + Math.min(40, sentContacts * 12) + Math.min(20, respondedContacts * 20)
  ));

  // Interview score
  const practicedCount = questions.filter((q) => q.practiced).length;
  const avgScore = questions.filter((q) => q.score !== null).reduce((sum, q) => sum + (q.score ?? 0), 0) /
    Math.max(1, questions.filter((q) => q.score !== null).length);
  const interviewScore = Math.min(100, Math.round(
    Math.min(50, practicedCount * 5) + Math.min(30, sessions * 10) + Math.min(20, avgScore * 2)
  ));

  const overallScore = Math.round((resumeScore + applicationScore + networkScore + interviewScore) / 4);

  const actionItems: string[] = [];
  if (resumeScore < 70) actionItems.push(!baseResume ? "Upload your base resume to get started" : "Tailor your resume for at least 3 saved jobs");
  if (applicationScore < 70) actionItems.push(appliedCount < 5 ? `Apply to ${5 - appliedCount} more saved jobs` : "Follow up on pending applications");
  if (networkScore < 70) actionItems.push(contacts < 3 ? "Find and save 3+ contacts at target companies" : "Send outreach messages to saved contacts");
  if (interviewScore < 70) actionItems.push(practicedCount < 5 ? "Practice at least 5 interview questions with AI feedback" : "Complete a full interview prep session");
  if (actionItems.length === 0) actionItems.push("Keep up the great work!", "Review and update your target company list", "Schedule a mock interview session");

  const score = await prisma.readinessScore.create({
    data: {
      userId,
      overallScore,
      resumeScore,
      applicationScore,
      networkScore,
      interviewScore,
      actionItems,
      insights: null,
    },
  });

  return NextResponse.json(score);
}
