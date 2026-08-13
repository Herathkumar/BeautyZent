import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

const COOKIE = "fh_salon_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export type SessionUser = {
  userId: string;
  salonId: string;
  email: string;
  name: string;
  role: string;
  stylistId?: string | null;
};

/** Salon manager / front desk (ADMIN kept for existing accounts; MANAGER is the preferred label). */
export function isSalonStaff(role: string | null | undefined) {
  return role === "ADMIN" || role === "MANAGER" || role === "FRONT_DESK";
}

/** Pure stylist login, or manager who is also linked as an active stylist. */
export function canAccessStylistPortal(
  session: SessionUser | null | undefined
): session is SessionUser & { stylistId: string } {
  if (!session?.stylistId) return false;
  return session.role === "STYLIST" || isSalonStaff(session.role);
}

async function issueSessionCookie(user: {
  id: string;
  salonId: string;
  email: string;
  name: string;
  role: string;
  stylistId: string | null;
}) {
  const token = await new SignJWT({
    userId: user.id,
    salonId: user.salonId,
    email: user.email,
    name: user.name,
    role: user.role,
    stylistId: user.stylistId,
  } satisfies SessionUser)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("14d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

/** Refresh JWT after linking/unlinking a stylist profile (e.g. manager also stylist). */
export async function refreshSessionForUserId(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  await issueSessionCookie(user);
  return user;
}

export type LoginResult =
  | { ok: true; user: { id: string; salonId: string; email: string; name: string; role: string; stylistId: string | null } }
  | { ok: false; reason: "invalid" | "wrong_salon" };

export async function login(
  email: string,
  password: string,
  opts?: { salonId?: string }
): Promise<LoginResult> {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user) return { ok: false, reason: "invalid" };
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { ok: false, reason: "invalid" };
  if (opts?.salonId && user.salonId !== opts.salonId) {
    return { ok: false, reason: "wrong_salon" };
  }

  await issueSessionCookie(user);
  return { ok: true, user };
}

export async function logout() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}

export async function requireAdmin() {
  const session = await requireSession();
  if (!isSalonStaff(session.role)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function requireStylist() {
  const session = await getStylistSession();
  if (!session) throw new Error("FORBIDDEN");
  return session;
}

/** Session allowed to use the stylist phone app (active linked stylist). */
export async function getStylistSession(): Promise<(SessionUser & { stylistId: string }) | null> {
  const session = await getSession();
  if (!canAccessStylistPortal(session)) return null;
  const stylist = await prisma.stylist.findFirst({
    where: { id: session.stylistId, salonId: session.salonId, active: true },
    select: { id: true },
  });
  if (!stylist) return null;
  return session;
}

/** Manager managing any stylist in salon, or stylist managing self */
export async function canManageStylist(stylistId: string) {
  const session = await getSession();
  if (!session) return null;
  if (isSalonStaff(session.role) && session.salonId) {
    const stylist = await prisma.stylist.findFirst({
      where: { id: stylistId, salonId: session.salonId },
    });
    if (stylist) return session;
  }
  if (session.stylistId === stylistId) {
    const active = await prisma.stylist.findFirst({
      where: { id: stylistId, active: true },
      select: { id: true },
    });
    if (active) return session;
  }
  return null;
}
