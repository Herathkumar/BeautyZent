import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  ensureConsumerAccountForClient,
  hashOtp,
  issueClientSession,
  listClientMembershipsByEmail,
  normalizeEmail,
} from "@/lib/client-auth";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
  /** Optional: bind session to this business immediately. */
  slug: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const otp = await prisma.consumerOtp.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.expiresAt.getTime() < Date.now()) {
    return NextResponse.json(
      { error: "That code expired. Request a new one." },
      { status: 400 }
    );
  }
  if (otp.attempts >= 5) {
    return NextResponse.json(
      { error: "Too many attempts. Request a new code." },
      { status: 429 }
    );
  }
  if (otp.codeHash !== hashOtp(parsed.data.code)) {
    await prisma.consumerOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 400 });
  }

  const salons = await listClientMembershipsByEmail(email);
  if (salons.length === 0) {
    return NextResponse.json({ error: "No memberships for this email." }, { status: 404 });
  }

  await prisma.consumerOtp.deleteMany({ where: { email } });

  const preferred =
    (parsed.data.slug
      ? salons.find((s) => s.salonSlug === parsed.data.slug)
      : null) || salons[0];

  const client = await prisma.client.findUnique({ where: { id: preferred.clientId } });
  if (!client?.email) {
    return NextResponse.json({ error: "Membership not found." }, { status: 404 });
  }

  const account = await ensureConsumerAccountForClient(client);
  await issueClientSession({
    ...client,
    accountId: account?.id ?? client.accountId,
  });

  return NextResponse.json({
    ok: true,
    accountId: account?.id ?? null,
    salons,
    currentSalonId: preferred.salonId,
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      preferredStylistId: client.preferredStylistId,
    },
    redirectTo: `/book/${preferred.salonSlug}`,
  });
}
