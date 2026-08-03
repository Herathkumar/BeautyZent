import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "STYLIST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "STYLIST") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const currentPassword = String(body.currentPassword || "");
  if (!currentPassword) {
    return NextResponse.json({ error: "Current password required" }, { status: 400 });
  }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const data: { email?: string; passwordHash?: string; name?: string } = {};

  if (body.email != null) {
    const email = String(body.email).toLowerCase().trim();
    if (!email.includes("@")) {
      return NextResponse.json({ error: "Enter a valid email / username" }, { status: 400 });
    }
    const taken = await prisma.user.findFirst({
      where: {
        salonId: user.salonId,
        email,
        NOT: { id: user.id },
      },
    });
    if (taken) {
      return NextResponse.json({ error: "That login is already in use" }, { status: 409 });
    }
    data.email = email;
  }

  if (body.newPassword != null && String(body.newPassword).length > 0) {
    const next = String(body.newPassword);
    if (next.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }
    data.passwordHash = await bcrypt.hash(next, 10);
  }

  if (body.name != null && String(body.name).trim()) {
    data.name = String(body.name).trim();
  }

  if (!data.email && !data.passwordHash && !data.name) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { id: true, email: true, name: true },
  });

  return NextResponse.json({
    ok: true,
    user: updated,
    message: "Login updated. Use your new credentials next time.",
  });
}
