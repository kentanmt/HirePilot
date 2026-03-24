import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id, isSaved: true, isArchived: false },
    orderBy: [{ matchScore: "desc" }, { createdAt: "desc" }],
    select: { id: true, title: true, company: true, location: true, remote: true, salaryMin: true, salaryMax: true, matchScore: true, url: true, description: true },
  });

  return NextResponse.json({ jobs });
}
