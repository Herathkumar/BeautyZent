import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isStaff(role: string) {
  return isSalonStaff(role);
}

function cleanPhone(value: unknown) {
  const phone = String(value ?? "").trim();
  return phone || null;
}

function cleanBio(value: unknown) {
  const bio = String(value ?? "").trim();
  if (bio.length > 280) return { error: "Bio must be 280 characters or less" as const };
  return { bio: bio || null };
}

export async function GET() {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, phone: true, bio: true, role: true },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wantsPassword =
    body.newPassword != null && String(body.newPassword).length > 0;
  const wantsProfile =
    body.name != null || body.phone !== undefined || body.bio !== undefined;

  // Profile-only update — no password required
  if (wantsProfile && !wantsPassword && !body.currentPassword) {
    const name = body.name != null ? String(body.name).trim() : undefined;
    if (name !== undefined && !name) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }
    const bioResult = body.bio !== undefined ? cleanBio(body.bio) : null;
    if (bioResult && "error" in bioResult) {
      return NextResponse.json({ error: bioResult.error }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(body.phone !== undefined ? { phone: cleanPhone(body.phone) } : {}),
        ...(bioResult ? { bio: bioResult.bio } : {}),
      },
      select: { id: true, email: true, name: true, phone: true, bio: true, role: true },
    });

    return NextResponse.json({
      ok: true,
      user: updated,
      message: "Profile updated.",
    });
  }

  const currentPassword = String(body.currentPassword || "");
  if (!currentPassword) {
    return NextResponse.json({ error: "Current password required" }, { status: 400 });
  }
  const ok = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const newPassword = String(body.newPassword || "");
  if (newPassword.length < 8) {
    return NextResponse.json(
      { error: "New password must be at least 8 characters" },
      { status: 400 }
    );
  }
  if (newPassword !== String(body.confirmPassword || "")) {
    return NextResponse.json({ error: "New password and confirmation do not match" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });

  return NextResponse.json({
    ok: true,
    message: "Password updated. Use your new password next time you sign in.",
  });
}
