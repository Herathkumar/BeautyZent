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

export async function login(email: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase().trim() },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;

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

  return user;
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
  const session = await requireSession();
  if (session.role !== "STYLIST" || !session.stylistId) {
    throw new Error("FORBIDDEN");
  }
  return session as SessionUser & { stylistId: string };
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
  if (session.role === "STYLIST" && session.stylistId === stylistId) {
    return session;
  }
  return null;
}
