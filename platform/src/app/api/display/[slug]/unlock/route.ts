import { NextResponse } from "next/server";
import {
  clearDisplayUnlockCookie,
  hasValidDisplayUnlock,
  issueDisplayUnlockCookie,
  normalizeDisplayPin,
  sessionBypassesDisplayPin,
  verifyDisplayPin,
} from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";

/** Check whether this tablet needs / already has PIN unlock. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, displayPinHash: true },
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

  const bypass = await sessionBypassesDisplayPin(salon.id);
  const unlocked = bypass || (await hasValidDisplayUnlock(salon.id));
  return NextResponse.json({
    pinSet: true,
    needsPin: !unlocked,
    unlocked,
    salon: { name: salon.name, slug: salon.slug },
  });
}

/** Unlock the store display with the manager-set PIN. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true, displayPinHash: true },
  });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  if (!salon.displayPinHash) {
    return NextResponse.json({
      ok: true,
      unlocked: true,
      needsPin: false,
      salon: { name: salon.name, slug: salon.slug },
    });
  }

  if (await sessionBypassesDisplayPin(salon.id)) {
    return NextResponse.json({
      ok: true,
      unlocked: true,
      needsPin: false,
      salon: { name: salon.name, slug: salon.slug },
    });
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

  await issueDisplayUnlockCookie({ id: salon.id, slug: salon.slug });

  return NextResponse.json({
    ok: true,
    unlocked: true,
    needsPin: false,
    salon: { name: salon.name, slug: salon.slug },
    message: "Store display unlocked.",
  });
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

  await clearDisplayUnlockCookie();
  return NextResponse.json({ ok: true, unlocked: false, needsPin: true });
}
