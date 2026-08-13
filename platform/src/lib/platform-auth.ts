import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

/** Separate cookie + secret from the salon session so tenant logins are unaffected. */
const COOKIE = "fh_platform_session";

function secret() {
  const s = process.env.PLATFORM_AUTH_SECRET || process.env.AUTH_SECRET;
  if (!s) throw new Error("PLATFORM_AUTH_SECRET (or AUTH_SECRET) is not set");
  return new TextEncoder().encode(s);
}

export type PlatformSession = {
  adminId: string;
  email: string;
  name: string;
};

/**
 * Local/dev escape hatch: a single operator account straight from env, so a fresh
 * database is reachable before `db:seed` has run.
 */
function envAdmin() {
  const email = process.env.PLATFORM_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.PLATFORM_ADMIN_PASSWORD;
  if (!email || !password) return null;
  return { email, password, name: process.env.PLATFORM_ADMIN_NAME || "Platform Admin" };
}

async function issueCookie(session: PlatformSession) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function platformLogin(email: string, password: string) {
  const normalized = email.toLowerCase().trim();

  const admin = await prisma.platformAdmin.findUnique({ where: { email: normalized } });
  if (admin?.active && (await bcrypt.compare(password, admin.passwordHash))) {
    await prisma.platformAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });
    const session: PlatformSession = { adminId: admin.id, email: admin.email, name: admin.name };
    await issueCookie(session);
    return session;
  }

  const fromEnv = envAdmin();
  if (fromEnv && fromEnv.email === normalized && fromEnv.password === password) {
    const session: PlatformSession = {
      adminId: `env:${fromEnv.email}`,
      email: fromEnv.email,
      name: fromEnv.name,
    };
    await issueCookie(session);
    return session;
  }

  return null;
}

export async function platformLogout() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getPlatformSession(): Promise<PlatformSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as PlatformSession;
  } catch {
    return null;
  }
}

export async function requirePlatformSession() {
  const session = await getPlatformSession();
  if (!session) throw new Error("UNAUTHORIZED");
  return session;
}
