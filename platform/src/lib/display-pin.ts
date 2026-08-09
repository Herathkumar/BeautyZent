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
  /** Invalidates unlock cookies when the manager changes the PIN. */
  pinSetAt: string;
};

function unlockCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Session cookie — closing the browser requires PIN again.
  };
}

export type DisplayUnlockSalon = {
  id: string;
  slug: string;
  displayPinSetAt: Date | null;
};

export async function createDisplayUnlockToken(salon: DisplayUnlockSalon) {
  const pinSetAt = salon.displayPinSetAt?.toISOString() ?? "";
  return new SignJWT({
    purpose: "display",
    salonId: salon.id,
    slug: salon.slug,
    pinSetAt,
  } satisfies UnlockPayload)
    .setProtectedHeader({ alg: "HS256" })
    // Hard cap even if the browser stays open on the floor.
    .setExpirationTime("12h")
    .sign(secret());
}

/** Prefer attaching the cookie on the Route Handler response (reliable in Next.js). */
export async function attachDisplayUnlockCookie(
  res: NextResponse,
  salon: DisplayUnlockSalon
) {
  const token = await createDisplayUnlockToken(salon);
  res.cookies.set(DISPLAY_UNLOCK_COOKIE, token, unlockCookieOptions());
  return res;
}

export function clearDisplayUnlockCookieOn(res: NextResponse) {
  res.cookies.set(DISPLAY_UNLOCK_COOKIE, "", {
    ...unlockCookieOptions(),
    maxAge: 0,
  });
  return res;
}

export async function issueDisplayUnlockCookie(salon: DisplayUnlockSalon) {
  const token = await createDisplayUnlockToken(salon);
  const jar = await cookies();
  jar.set(DISPLAY_UNLOCK_COOKIE, token, unlockCookieOptions());
}

export async function clearDisplayUnlockCookie() {
  const jar = await cookies();
  jar.delete(DISPLAY_UNLOCK_COOKIE);
}

export async function hasValidDisplayUnlock(salon: {
  id: string;
  displayPinSetAt?: Date | null;
}): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(DISPLAY_UNLOCK_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    const data = payload as unknown as UnlockPayload;
    if (data.purpose !== "display" || data.salonId !== salon.id) return false;
    const expected = salon.displayPinSetAt?.toISOString() ?? "";
    // Older cookies without pinSetAt are rejected once a PIN version exists.
    return data.pinSetAt === expected;
  } catch {
    return false;
  }
}

/**
 * Staff/stylist already signed into this salon can use the board inside
 * manager/stylist apps without the tablet PIN. The public /display/[slug]
 * tablet URL does NOT use this bypass — it always asks for the PIN.
 */
export async function sessionBypassesDisplayPin(salonId: string): Promise<boolean> {
  const session = await getSession();
  return Boolean(session?.salonId === salonId);
}

export type DisplaySalonGate = {
  id: string;
  slug: string;
  displayPinHash: string | null;
  displayPinSetAt?: Date | null;
};

/**
 * When a display PIN is set, require unlock cookie or a salon login session.
 * Returns a 401 Response when locked.
 */
export async function assertDisplayAccess(salon: DisplaySalonGate): Promise<NextResponse | null> {
  if (!salon.displayPinHash) return null;
  if (await sessionBypassesDisplayPin(salon.id)) return null;
  if (
    await hasValidDisplayUnlock({
      id: salon.id,
      displayPinSetAt: salon.displayPinSetAt ?? null,
    })
  ) {
    return null;
  }
  return NextResponse.json(
    { error: "Salon display PIN required", needsPin: true },
    { status: 401 }
  );
}

export function pinRequiredResponse() {
  return NextResponse.json(
    { error: "Salon display PIN required", needsPin: true },
    { status: 401 }
  );
}
