import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  generateOtpCode,
  hashOtp,
  normalizeEmail,
} from "@/lib/client-auth";
import { sendClientOtpEmail } from "@/lib/client-email";

const bodySchema = z.object({
  email: z.string().email(),
  purpose: z.enum(["signin", "join"]).default("signin"),
  name: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const purpose = parsed.data.purpose;

  if (purpose === "join") {
    if (!parsed.data.name?.trim() || !parsed.data.phone?.trim()) {
      return NextResponse.json(
        { error: "Name and phone are needed to join." },
        { status: 400 }
      );
    }
  } else {
    const member = await prisma.client.findFirst({
      where: { salonId: salon.id, email, memberAt: { not: null } },
    });
    if (!member) {
      return NextResponse.json(
        { error: "No member account for this email. Join in a moment — it’s free." },
        { status: 404 }
      );
    }
  }

  await prisma.clientOtp.deleteMany({
    where: { salonId: salon.id, email },
  });

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.clientOtp.create({
    data: {
      salonId: salon.id,
      email,
      codeHash: hashOtp(code),
      purpose,
      name: parsed.data.name?.trim() || null,
      phone: parsed.data.phone?.trim() || null,
      expiresAt,
    },
  });

  let demo = false;
  try {
    const sent = await sendClientOtpEmail({
      to: email,
      code,
      salonName: salon.name,
    });
    demo = sent.demo;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not send email" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: demo
      ? "Demo mode: use the code shown below (email provider not configured)."
      : "Check your email for a 6-digit code.",
    expiresInSec: 600,
    ...(demo || process.env.NODE_ENV !== "production" ? { demoCode: code } : {}),
  });
}
