import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  hashOtp,
  issueClientSession,
  normalizeEmail,
} from "@/lib/client-auth";

const bodySchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
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
    return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
  }

  const email = normalizeEmail(parsed.data.email);
  const otp = await prisma.clientOtp.findFirst({
    where: { salonId: salon.id, email },
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
    await prisma.clientOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    return NextResponse.json({ error: "Incorrect code. Try again." }, { status: 400 });
  }

  let client = await prisma.client.findFirst({
    where: { salonId: salon.id, email },
  });

  if (otp.purpose === "join") {
    const name = otp.name?.trim() || client?.name;
    const phone = otp.phone?.trim() || client?.phone;
    if (!name || !phone) {
      return NextResponse.json(
        { error: "Name and phone are required to join." },
        { status: 400 }
      );
    }
    if (!client) {
      const byPhone = await prisma.client.findFirst({
        where: { salonId: salon.id, phone },
      });
      if (byPhone) {
        client = await prisma.client.update({
          where: { id: byPhone.id },
          data: {
            name,
            email,
            phone,
            memberAt: byPhone.memberAt ?? new Date(),
          },
        });
      } else {
        client = await prisma.client.create({
          data: {
            salonId: salon.id,
            name,
            phone,
            email,
            memberAt: new Date(),
          },
        });
      }
    } else {
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          name,
          phone,
          email,
          memberAt: client.memberAt ?? new Date(),
        },
      });
    }
  } else {
    if (!client?.memberAt) {
      return NextResponse.json(
        { error: "No member account for this email." },
        { status: 404 }
      );
    }
  }

  await prisma.clientOtp.deleteMany({ where: { salonId: salon.id, email } });
  await issueClientSession(client);

  return NextResponse.json({
    ok: true,
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      preferredStylistId: client.preferredStylistId,
    },
  });
}
