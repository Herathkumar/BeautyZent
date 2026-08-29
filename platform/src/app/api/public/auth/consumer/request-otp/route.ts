import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  generateOtpCode,
  hashOtp,
  listClientMembershipsByEmail,
  normalizeEmail,
} from "@/lib/client-auth";
import { sendClientOtpEmail } from "@/lib/client-email";

const bodySchema = z.object({
  email: z.string().email(),
});

/**
 * Global consumer OTP — one code for the account email (not salon-scoped).
 * After verify, client picks a business membership.
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const memberships = await listClientMembershipsByEmail(email);
  if (memberships.length === 0) {
    return NextResponse.json(
      {
        error:
          "No memberships for this email yet. Join from a business booking page first.",
      },
      { status: 404 }
    );
  }

  await prisma.consumerOtp.deleteMany({ where: { email } });
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  const account = await prisma.consumerAccount.findUnique({ where: { email } });

  await prisma.consumerOtp.create({
    data: {
      email,
      codeHash: hashOtp(code),
      purpose: "signin",
      expiresAt,
      accountId: account?.id ?? null,
    },
  });

  let demo = false;
  try {
    const sent = await sendClientOtpEmail({
      to: email,
      code,
      salonName: "BeautyZent",
    });
    demo = sent.demo;
  } catch {
    return NextResponse.json(
      { error: "Could not send the email code. Try again shortly." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Check your email for a sign-in code.",
    membershipCount: memberships.length,
    ...(demo && process.env.NODE_ENV !== "production" ? { demoCode: code } : {}),
  });
}
