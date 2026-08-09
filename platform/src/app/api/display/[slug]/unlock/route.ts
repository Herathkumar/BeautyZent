import { NextResponse } from "next/server";
import {
  clearDisplayUnlockCookieOn,
  createDisplayUnlockToken,
  normalizeDisplayPin,
  sessionBypassesDisplayPin,
  verifyDisplayPin,
} from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";

/**
 * Check whether this tablet needs PIN unlock.
 *
 * Public tablet URL: always needs PIN when set (no cookie unlock).
 * Embedded manager/stylist apps (`?mode=embedded`): signed-in staff skip PIN.
 */
export async function GET(
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

  const pinSet = Boolean(salon.displayPinHash);
  if (!pinSet) {
    return NextResponse.json({
      pinSet: false,
      needsPin: false,
      unlocked: true,
      salon: { name: salon.name, slug: salon.slug },
    });
  }

  const mode = new URL(req.url).searchParams.get("mode");
  const unlockedBySession =
    mode === "embedded" && (await sessionBypassesDisplayPin(salon.id));

  const res = NextResponse.json({
    pinSet: true,
    needsPin: !unlockedBySession,
    unlocked: unlockedBySession,
    salon: { name: salon.name, slug: salon.slug },
  });
  // Drop any legacy unlock cookies so refresh never auto-unlocks the tablet.
  if (mode !== "embedded") clearDisplayUnlockCookieOn(res);
  return res;
}

/** Unlock the salon display with the manager-set PIN (returns in-memory token). */
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

  if (!salon.displayPinHash) {
    return NextResponse.json({
      ok: true,
      unlocked: true,
      needsPin: false,
      unlockToken: null,
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

  const unlockToken = await createDisplayUnlockToken({
    id: salon.id,
    slug: salon.slug,
    displayPinSetAt: salon.displayPinSetAt,
  });

  const res = NextResponse.json({
    ok: true,
    unlocked: true,
    needsPin: false,
    unlockToken,
    salon: { name: salon.name, slug: salon.slug },
    message: "Salon display unlocked.",
  });
  // Do not set a persistent cookie — refresh must ask for PIN again.
  clearDisplayUnlockCookieOn(res);
  return res;
}

/** Lock this browser/tablet again. */
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
