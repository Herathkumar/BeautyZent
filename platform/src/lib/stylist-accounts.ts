import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

/** Domain for stylist logins: salon email domain, or slug.ca, or env override. */
export function stylistEmailDomain(salon: { email: string | null; slug: string }) {
  const fromEnv = process.env.STYLIST_EMAIL_DOMAIN?.trim();
  if (fromEnv) return fromEnv.toLowerCase();
  if (salon.email?.includes("@")) {
    return salon.email.split("@")[1]!.toLowerCase();
  }
  return `${salon.slug}.ca`.toLowerCase();
}

/** "Aisha Khan" → "aisha" (first token, alphanumeric). */
export function emailLocalFromName(name: string) {
  const cleaned = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim();
  const first = cleaned.split(/[\s_-]+/).filter(Boolean)[0] || "stylist";
  return first.replace(/_/g, "");
}

export async function uniqueStylistEmail(salonId: string, name: string, domain: string) {
  const base = emailLocalFromName(name);
  let n = 0;
  while (n < 50) {
    const local = n === 0 ? base : `${base}${n + 1}`;
    const email = `${local}@${domain}`;
    const exists = await prisma.user.findFirst({
      where: { salonId, email },
      select: { id: true },
    });
    if (!exists) return email;
    n += 1;
  }
  return `${base}${Date.now().toString(36)}@${domain}`;
}

export function generateInitialPassword(length = 10) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i]! % alphabet.length];
  }
  return out;
}

export async function createStylistLogin(opts: {
  salonId: string;
  stylistId: string;
  name: string;
  domain: string;
  password?: string;
}) {
  const email = await uniqueStylistEmail(opts.salonId, opts.name, opts.domain);
  const password = opts.password || generateInitialPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      salonId: opts.salonId,
      email,
      passwordHash,
      name: opts.name,
      role: "STYLIST",
      stylistId: opts.stylistId,
    },
  });
  return { user, email, password };
}

export async function resetStylistPassword(userId: string) {
  const password = generateInitialPassword();
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
  return password;
}
