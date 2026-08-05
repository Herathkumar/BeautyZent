import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const DISPLAY_UNLOCK_COOKIE = "fh_display_unlock";
const PIN_RE = /^\d{4,6}$/;

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export function normalizeDisplayPin(raw: unknown): string | null {
  const pin = String(raw ?? "").trim();
  if (!PIN_RE.test(pin)) return null;
  return pin;
}

export async function hashDisplayPin(pin: string) {
  return bcrypt.hash(pin, 12);
}

export async function verifyDisplayPin(pin: string, hash: string) {
  return bcrypt.compare(pin, hash);
}

type UnlockPayload = {
  purpose: "display";
  salonId: string;
  slug: string;
};

export async function issueDisplayUnlockCookie(salon: { id: string; slug: string }) {
  const token = await new SignJWT({
    purpose: "display",
    salonId: salon.id,
    slug: salon.slug,
  } satisfies UnlockPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());

  const jar = await cookies();
  jar.set(DISPLAY_UNLOCK_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearDisplayUnlockCookie() {
  const jar = await cookies();
  jar.delete(DISPLAY_UNLOCK_COOKIE);
}

export async function hasValidDisplayUnlock(salonId: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(DISPLAY_UNLOCK_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    const data = payload as unknown as UnlockPayload;
    return data.purpose === "display" && data.salonId === salonId;
  } catch {
    return false;
  }
}

/** Staff/stylist already signed into this salon can use the board without the tablet PIN. */
export async function sessionBypassesDisplayPin(salonId: string): Promise<boolean> {
  const session = await getSession();
  return Boolean(session?.salonId === salonId);
}

export type DisplaySalonGate = {
  id: string;
  slug: string;
  displayPinHash: string | null;
};

/**
 * When a display PIN is set, require unlock cookie or a salon login session.
 * Returns a 401 Response when locked.
 */
export async function assertDisplayAccess(salon: DisplaySalonGate): Promise<NextResponse | null> {
  if (!salon.displayPinHash) return null;
  if (await sessionBypassesDisplayPin(salon.id)) return null;
  if (await hasValidDisplayUnlock(salon.id)) return null;
  return NextResponse.json(
    { error: "Store display PIN required", needsPin: true },
    { status: 401 }
  );
}

export function pinRequiredResponse() {
  return NextResponse.json(
    { error: "Store display PIN required", needsPin: true },
    { status: 401 }
  );
}
