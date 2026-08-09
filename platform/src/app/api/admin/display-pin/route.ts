import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import {
  clearDisplayUnlockCookie,
  hashDisplayPin,
  normalizeDisplayPin,
  verifyDisplayPin,
} from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Manager-only: tablet PIN status for the store display. */
export async function GET() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) return unauthorized();

  const salon = await prisma.salon.findUnique({
    where: { id: session.salonId },
    select: { id: true, slug: true, displayPinHash: true, displayPinSetAt: true },
  });
  if (!salon) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    pinSet: Boolean(salon.displayPinHash),
    setAt: salon.displayPinSetAt?.toISOString() ?? null,
    slug: salon.slug,
  });
}

/** Create or update the store display PIN (manager only). */
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) return unauthorized();

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pin = normalizeDisplayPin(body.pin);
  const confirm = normalizeDisplayPin(body.confirmPin);
  if (!pin || !confirm) {
    return NextResponse.json(
      { error: "PIN must be 4–6 digits." },
      { status: 400 }
    );
  }
  if (pin !== confirm) {
    return NextResponse.json({ error: "PIN and confirmation do not match." }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({
    where: { id: session.salonId },
    select: { displayPinHash: true },
  });
  if (!salon) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Changing an existing PIN requires the current PIN (unless first-time set).
  if (salon.displayPinHash) {
    const current = normalizeDisplayPin(body.currentPin);
    if (!current) {
      return NextResponse.json(
        { error: "Enter the current PIN to change it." },
        { status: 400 }
      );
    }
    const ok = await verifyDisplayPin(current, salon.displayPinHash);
    if (!ok) {
      return NextResponse.json({ error: "Current PIN is incorrect." }, { status: 400 });
    }
  }

  const displayPinHash = await hashDisplayPin(pin);
  const updated = await prisma.salon.update({
    where: { id: session.salonId },
    data: { displayPinHash, displayPinSetAt: new Date() },
    select: { displayPinSetAt: true, slug: true },
  });

  // Force tablet to re-enter the new PIN
  await clearDisplayUnlockCookie();

  return NextResponse.json({
    ok: true,
    pinSet: true,
    setAt: updated.displayPinSetAt?.toISOString() ?? null,
    slug: updated.slug,
    message: salon.displayPinHash
      ? "Salon display PIN updated. Tablets will need the new PIN."
      : "Salon display PIN set. The tablet URL now asks for this PIN every time.",
  });
}

/** Remove the store display PIN (manager only) — board becomes public again. */
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) return unauthorized();

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const salon = await prisma.salon.findUnique({
    where: { id: session.salonId },
    select: { displayPinHash: true },
  });
  if (!salon) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!salon.displayPinHash) {
    return NextResponse.json({ ok: true, pinSet: false, message: "No PIN was set." });
  }

  const current = normalizeDisplayPin(body.currentPin);
  if (!current) {
    return NextResponse.json(
      { error: "Enter the current PIN to remove it." },
      { status: 400 }
    );
  }
  const ok = await verifyDisplayPin(current, salon.displayPinHash);
  if (!ok) {
    return NextResponse.json({ error: "Current PIN is incorrect." }, { status: 400 });
  }

  await prisma.salon.update({
    where: { id: session.salonId },
    data: { displayPinHash: null, displayPinSetAt: null },
  });
  await clearDisplayUnlockCookie();

  return NextResponse.json({
    ok: true,
    pinSet: false,
    message: "Salon display PIN removed. The tablet URL is open again.",
  });
}
