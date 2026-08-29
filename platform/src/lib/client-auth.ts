import { createHash, randomInt } from "crypto";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import { CLIENT_CANCEL_HOURS } from "./client-booking";

export { CLIENT_CANCEL_HOURS, ANY_STYLIST_ID } from "./client-booking";

const COOKIE = "fh_client_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(s);
}

export type ClientSession = {
  clientId: string;
  salonId: string;
  email: string;
  name: string;
  phone: string | null;
  accountId?: string | null;
};

export function hashOtp(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export function generateOtpCode() {
  return String(randomInt(100000, 999999));
}

export async function issueClientSession(client: {
  id: string;
  salonId: string;
  email: string | null;
  name: string;
  phone: string | null;
  accountId?: string | null;
}) {
  if (!client.email) throw new Error("Client email required for session");
  const token = await new SignJWT({
    clientId: client.id,
    salonId: client.salonId,
    email: client.email,
    name: client.name,
    phone: client.phone,
    accountId: client.accountId ?? null,
  } satisfies ClientSession)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret());

  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearClientSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getClientSession(): Promise<ClientSession | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as ClientSession;
  } catch {
    return null;
  }
}

export async function getClientSessionForSalon(salonId: string) {
  const session = await getClientSession();
  if (!session || session.salonId !== salonId) return null;
  const client = await prisma.client.findFirst({
    where: { id: session.clientId, salonId, memberAt: { not: null } },
  });
  if (!client?.email) return null;
  return {
    clientId: client.id,
    salonId: client.salonId,
    email: client.email,
    name: client.name,
    phone: client.phone,
    accountId: client.accountId,
  } satisfies ClientSession;
}

/**
 * Upsert global consumer by email and link the membership Client row.
 * Safe to call from salon-scoped OTP verify (non-breaking dual-write).
 */
export async function ensureConsumerAccountForClient(client: {
  id: string;
  email: string | null;
  name: string;
  phone: string | null;
  accountId?: string | null;
}) {
  if (!client.email) return null;
  const email = normalizeEmail(client.email);
  const account = await prisma.consumerAccount.upsert({
    where: { email },
    create: {
      email,
      name: client.name,
      phone: client.phone,
      emailVerifiedAt: new Date(),
    },
    update: {
      emailVerifiedAt: new Date(),
      ...(client.name ? { name: client.name } : {}),
      ...(client.phone ? { phone: client.phone } : {}),
    },
  });

  if (client.accountId !== account.id) {
    await prisma.client.update({
      where: { id: client.id },
      data: { accountId: account.id },
    });
  }
  return account;
}

export function canCancelOnline(startsAt: Date, now = new Date()) {
  const ms = startsAt.getTime() - now.getTime();
  return ms >= CLIENT_CANCEL_HOURS * 60 * 60 * 1000;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export type ClientSalonMembership = {
  clientId: string;
  salonId: string;
  salonName: string;
  salonSlug: string;
  memberName: string;
  businessType?: string;
};

/** All active salon memberships for an email (multi-tenant client). */
export async function listClientMembershipsByEmail(
  email: string
): Promise<ClientSalonMembership[]> {
  const normalized = normalizeEmail(email);
  if (!normalized) return [];
  const rows = await prisma.client.findMany({
    where: {
      email: normalized,
      memberAt: { not: null },
      salon: { active: true },
    },
    select: {
      id: true,
      name: true,
      salonId: true,
      salon: { select: { id: true, name: true, slug: true, businessType: true } },
    },
    orderBy: { salon: { name: "asc" } },
  });
  return rows.map((r) => ({
    clientId: r.id,
    salonId: r.salonId,
    salonName: r.salon.name,
    salonSlug: r.salon.slug,
    memberName: r.name,
    businessType: r.salon.businessType,
  }));
}
