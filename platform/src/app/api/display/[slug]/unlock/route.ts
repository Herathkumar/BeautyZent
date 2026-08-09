import { NextResponse } from "next/server";
import {
  attachDisplayUnlockCookie,
  clearDisplayUnlockCookieOn,
  hasValidDisplayUnlock,
  normalizeDisplayPin,
  verifyDisplayPin,
} from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";

/**
 * Check whether this tablet needs / already has PIN unlock.
 * Staff login does NOT skip the PIN on the public tablet URL — only a valid
 * unlock cookie (set after entering the PIN) does.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      displayPinHash: true,
      displayPinSetAt: true,
    },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const pinSet = Boolean(salon.displayPinHash);
  if (!pinSet) {
    return NextResponse.json({
      pinSet: false,
      needsPin: false,
      unlocked: true,
      salon: { name: salon.name, slug: salon.slug },
    });
  }

  const unlocked = await hasValidDisplayUnlock({
    id: salon.id,
    displayPinSetAt: salon.displayPinSetAt,
  });
  return NextResponse.json({
    pinSet: true,
    needsPin: !unlocked,
    unlocked,
    salon: { name: salon.name, slug: salon.slug },
  });
}

/** Unlock the salon display with the manager-set PIN. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      displayPinHash: true,
      displayPinSetAt: true,
    },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const unlockedBody = {
    ok: true,
    unlocked: true,
    needsPin: false,
    salon: { name: salon.name, slug: salon.slug },
  };

  if (!salon.displayPinHash) {
    return NextResponse.json(unlockedBody);
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const pin = normalizeDisplayPin(body.pin);
  if (!pin) {
    return NextResponse.json({ error: "Enter the 4–6 digit PIN." }, { status: 400 });
  }

  const ok = await verifyDisplayPin(pin, salon.displayPinHash);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect PIN." }, { status: 401 });
  }

  const res = NextResponse.json({
    ...unlockedBody,
    message: "Salon display unlocked.",
  });
  await attachDisplayUnlockCookie(res, {
    id: salon.id,
    slug: salon.slug,
    displayPinSetAt: salon.displayPinSetAt,
  });
  return res;
}

/** Lock this browser/tablet again (clears unlock cookie). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const res = NextResponse.json({ ok: true, unlocked: false, needsPin: true });
  clearDisplayUnlockCookieOn(res);
  return res;
}
