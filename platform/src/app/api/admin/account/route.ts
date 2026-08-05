import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getSession, isSalonStaff, refreshSessionForUserId } from "@/lib/auth";
import { setManagerAlsoStylist } from "@/lib/manager-stylist";
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
  const session = await getSession();
  if (!session || !isStaff(session.role)) {
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
      role: true,
      stylistId: true,
      stylist: { select: { id: true, active: true, selfManageSchedule: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      bio: user.bio,
      role: user.role,
      stylistId: user.stylistId,
      alsoStylist: Boolean(user.stylist?.active),
    },
  });
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
  const wantsAlsoStylist = typeof body.alsoStylist === "boolean";
  const wantsProfile =
    body.name != null ||
    body.email != null ||
    body.phone !== undefined ||
    body.bio !== undefined ||
    wantsAlsoStylist;

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
    let email: string | undefined;
    if (body.email != null) {
      const emailResult = await validateEmail({
        email: String(body.email),
        salonId: user.salonId,
        userId: user.id,
      });
      if ("error" in emailResult) {
        return NextResponse.json({ error: emailResult.error }, { status: 400 });
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
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        bio: true,
        role: true,
        stylistId: true,
      },
    });

    if (updated.stylistId && (name !== undefined || bioResult)) {
      await prisma.stylist.update({
        where: { id: updated.stylistId },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(bioResult ? { bio: bioResult.bio } : {}),
        },
      });
    }

    let alsoStylist: boolean | undefined;
    if (wantsAlsoStylist) {
      const result = await setManagerAlsoStylist({
        userId: user.id,
        salonId: user.salonId,
        enabled: Boolean(body.alsoStylist),
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }
      alsoStylist = result.alsoStylist;
      if (email !== undefined || name !== undefined) {
        await refreshSessionForUserId(user.id);
      }
    }

    const fresh = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        bio: true,
        role: true,
        stylistId: true,
        stylist: { select: { active: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      user: {
        id: fresh!.id,
        email: fresh!.email,
        name: fresh!.name,
        phone: fresh!.phone,
        bio: fresh!.bio,
        role: fresh!.role,
        stylistId: fresh!.stylistId,
        alsoStylist: alsoStylist ?? Boolean(fresh!.stylist?.active),
      },
      message: wantsAlsoStylist
        ? alsoStylist
          ? "You are also a self-managed stylist. Open the Stylist App with this same login."
          : "Stylist profile turned off. Manager access is unchanged."
        : "Profile updated.",
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
