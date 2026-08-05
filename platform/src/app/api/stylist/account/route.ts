import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getStylistSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function cleanPhone(value: unknown) {
  const phone = String(value ?? "").trim();
  return phone || null;
}

function cleanBio(value: unknown) {
  const bio = String(value ?? "").trim();
  if (bio.length > 280) return { error: "Bio must be 280 characters or less" as const };
  return { bio: bio || null };
}

async function validateEmail(opts: {
  email: string;
  salonId: string;
  userId: string;
}): Promise<{ email: string } | { error: string }> {
  const email = opts.email.toLowerCase().trim();
  if (!email.includes("@")) {
    return { error: "Enter a valid email" };
  }
  const taken = await prisma.user.findFirst({
    where: {
      salonId: opts.salonId,
      email,
      NOT: { id: opts.userId },
    },
  });
  if (taken) {
    return { error: "That email is already in use" };
  }
  return { email };
}

export async function GET() {
  const session = await getStylistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      bio: true,
      stylistId: true,
      stylist: { select: { name: true, bio: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.stylist?.name || user.name,
      phone: user.phone,
      bio: user.bio ?? user.stylist?.bio ?? null,
    },
  });
}

export async function PATCH(req: Request) {
  const session = await getStylistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const wantsLoginChange =
    body.newPassword != null && String(body.newPassword).length > 0;
  const wantsProfile =
    body.name != null ||
    body.email != null ||
    body.phone !== undefined ||
    body.bio !== undefined;

  // Profile-only update — no password required
  if (wantsProfile && !wantsLoginChange && !body.currentPassword) {
    const name = body.name != null ? String(body.name).trim() : undefined;
    if (name !== undefined && !name) {
      return NextResponse.json({ error: "Display name is required" }, { status: 400 });
    }
    const bioResult = body.bio !== undefined ? cleanBio(body.bio) : null;
    if (bioResult && "error" in bioResult) {
      return NextResponse.json({ error: bioResult.error }, { status: 400 });
    }
    let email: string | undefined;
    if (body.email != null) {
      const emailResult = await validateEmail({
        email: String(body.email),
        salonId: user.salonId,
        userId: user.id,
      });
      if ("error" in emailResult) {
        return NextResponse.json(
          { error: emailResult.error },
          { status: emailResult.error.includes("already") ? 409 : 400 }
        );
      }
      email = emailResult.email;
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(body.phone !== undefined ? { phone: cleanPhone(body.phone) } : {}),
        ...(bioResult ? { bio: bioResult.bio } : {}),
      },
      select: { id: true, email: true, name: true, phone: true, bio: true, stylistId: true },
    });

    if (user.stylistId && (name !== undefined || bioResult)) {
      await prisma.stylist.update({
        where: { id: user.stylistId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(bioResult ? { bio: bioResult.bio } : {}),
        },
      });
    }

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
    select: { id: true, email: true, name: true, phone: true, bio: true },
  });

  if (data.name && user.stylistId) {
    await prisma.stylist.update({
      where: { id: user.stylistId },
      data: { name: data.name },
    });
  }

  return NextResponse.json({
    ok: true,
    user: updated,
    message: "Login updated. Use your new credentials next time.",
  });
}
