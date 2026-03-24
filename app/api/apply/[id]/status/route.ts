import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status, note } = await req.json();

  const application = await prisma.application.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!application) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.application.update({
    where: { id: params.id },
    data: { status },
  });

  await prisma.applicationStatusHistory.create({
    data: { applicationId: params.id, status, note },
  });

  return NextResponse.json(updated);
}
