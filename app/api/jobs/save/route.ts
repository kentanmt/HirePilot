import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await req.json();

  let saved: any;

  // If job already exists in DB (e.g. a recommended job), just mark it saved
  if (job.id) {
    const existing = await prisma.job.findFirst({
      where: { id: job.id, userId: session.user.id },
    });
    if (existing) {
      saved = await prisma.job.update({
        where: { id: existing.id },
        data: { isSaved: true, isArchived: false },
      });
    }
  }

  // Otherwise create a new job record
  if (!saved) {
    saved = await prisma.job.create({
      data: {
        userId: session.user.id,
        title: job.title,
        company: job.company,
        location: job.location ?? null,
        remote: job.remote ?? false,
        salaryMin: job.salaryMin ?? null,
        salaryMax: job.salaryMax ?? null,
        description: job.description ?? null,
        requirements: job.requirements ?? [],
        url: job.url ?? null,
        source: job.source ?? null,
        matchScore: job.matchScore ?? null,
        matchReason: job.matchReason ?? null,
        isSaved: true,
        isArchived: false,
      },
    });
  }

  // Auto-create application record if it doesn't exist
  const existingApp = await prisma.application.findFirst({
    where: { userId: session.user.id, jobId: saved.id },
  });
  if (!existingApp) {
    await prisma.application.create({
      data: { userId: session.user.id, jobId: saved.id, status: "NOT_STARTED" },
    });
  }

  return NextResponse.json(saved);
}
