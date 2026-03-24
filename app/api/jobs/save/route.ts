import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const job = await req.json();

  const saved = await prisma.job.create({
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

  // Auto-create application record
  await prisma.application.create({
    data: {
      userId: session.user.id,
      jobId: saved.id,
      status: "NOT_STARTED",
    },
  });

  return NextResponse.json(saved);
}
