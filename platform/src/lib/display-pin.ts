import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const DISPLAY_UNLOCK_COOKIE = "fh_display_unlock";
export const DISPLAY_UNLOCK_HEADER = "x-display-unlock";
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
  /** Invalidates tokens when the manager changes the PIN. */
  pinSetAt: string;
};

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
    // In-memory on the tablet — refresh clears it. Cap lifetime if a tab stays open.
    .setExpirationTime("12h")
    .sign(secret());
}

/** Clear legacy unlock cookies (older builds persisted unlock across refresh). */
export function clearDisplayUnlockCookieOn(res: NextResponse) {
  res.cookies.set(DISPLAY_UNLOCK_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}

export async function clearDisplayUnlockCookie() {
  const jar = await cookies();
  jar.delete(DISPLAY_UNLOCK_COOKIE);
}

export function unlockTokenFromRequest(req: Request | undefined): string | null {
  if (!req) return null;
  const header = req.headers.get(DISPLAY_UNLOCK_HEADER);
  if (header?.trim()) return header.trim();
  const auth = req.headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return null;
}

export async function isValidDisplayUnlockToken(
  token: string | null | undefined,
  salon: { id: string; displayPinSetAt?: Date | null }
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    const data = payload as unknown as UnlockPayload;
    if (data.purpose !== "display" || data.salonId !== salon.id) return false;
    const expected = salon.displayPinSetAt?.toISOString() ?? "";
    return data.pinSetAt === expected;
  } catch {
    return false;
  }
}

/**
 * Staff/stylist already signed into this salon can use the board inside
 * manager/stylist apps without the tablet PIN.
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
 * When a display PIN is set, require an in-memory unlock token (header) or a
 * salon login session. Public tablet does not use cookies — refresh asks again.
 */
export async function assertDisplayAccess(
  salon: DisplaySalonGate,
  req?: Request
): Promise<NextResponse | null> {
  if (!salon.displayPinHash) return null;
  if (await sessionBypassesDisplayPin(salon.id)) return null;
  if (
    await isValidDisplayUnlockToken(unlockTokenFromRequest(req), {
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
