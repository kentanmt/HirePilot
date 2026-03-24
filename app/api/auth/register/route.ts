import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: "Invalid input." }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
    });

    // Create empty profile
    await prisma.userProfile.create({
      data: { userId: user.id },
    });

    return NextResponse.json({ id: user.id, email: user.email });
  } catch (err) {
    console.error("[register]", err);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
