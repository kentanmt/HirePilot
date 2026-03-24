import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resume = await prisma.resume.findFirst({
    where: { userId: session.user.id, isBase: true },
  });

  return NextResponse.json({ content: resume?.content ?? null, fileName: resume?.fileName ?? null });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content, fileName } = await req.json();
  if (!content) return NextResponse.json({ error: "No content" }, { status: 400 });

  // Upsert base resume
  const existing = await prisma.resume.findFirst({
    where: { userId: session.user.id, isBase: true },
  });

  if (existing) {
    await prisma.resume.update({
      where: { id: existing.id },
      data: { content, fileName: fileName ?? existing.fileName },
    });
  } else {
    await prisma.resume.create({
      data: {
        userId: session.user.id,
        content,
        fileName: fileName ?? "resume",
        isBase: true,
        version: 1,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
