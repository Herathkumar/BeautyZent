import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getClientSession,
  getConsumerSession,
  issueClientSession,
  normalizeEmail,
} from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(40).optional(),
});

export async function GET() {
  const account = await getConsumerSession();
  if (!account) {
    return NextResponse.json({ error: "Sign in to view your account." }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    where: {
      memberAt: { not: null },
      OR: [
        { accountId: account.id },
        { email: { equals: normalizeEmail(account.email), mode: "insensitive" } },
      ],
      salon: { active: true, listingStatus: "PUBLISHED" },
    },
    orderBy: { salon: { name: "asc" } },
    select: {
      id: true,
      salonId: true,
      name: true,
      loyaltyPoints: true,
      salon: {
        select: {
          name: true,
          slug: true,
          businessType: true,
          city: true,
          region: true,
          address: true,
          coverUpdatedAt: true,
          loyaltyEnabled: true,
          discountsEnabled: true,
          loyaltyPointsPerDollar: true,
          loyaltyCentsPerPoint: true,
          loyaltyMaxRedeemPercent: true,
          _count: {
            select: {
              promotionRules: { where: { enabled: true } },
            },
          },
        },
      },
      _count: {
        select: {
          appointments: { where: { status: "COMPLETED" } },
        },
      },
    },
  });

  const favorites = await prisma.consumerFavorite.findMany({
    where: {
      accountId: account.id,
      salon: { active: true, listingStatus: "PUBLISHED" },
    },
    orderBy: { createdAt: "desc" },
    select: {
      salon: {
        select: {
          id: true,
          name: true,
          slug: true,
          businessType: true,
          city: true,
          region: true,
          address: true,
          description: true,
          coverUpdatedAt: true,
        },
      },
    },
  });

  return NextResponse.json({
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      phone: account.phone,
    },
    memberships: clients.map((client) => ({
      clientId: client.id,
      salonId: client.salonId,
      memberName: client.name,
      salon: {
        ...client.salon,
        offerCount: client.salon.discountsEnabled
          ? client.salon._count.promotionRules
          : 0,
        _count: undefined,
      },
      rewards: {
        enabled: client.salon.loyaltyEnabled,
        points: client.loyaltyPoints,
        redeemValueCents:
          client.loyaltyPoints * (client.salon.loyaltyCentsPerPoint || 5),
        completedVisits: client._count.appointments,
      },
    })),
    favorites: favorites.map(({ salon }) => ({
      ...salon,
      coverUrl: salon.coverUpdatedAt
        ? `/api/public/cover/${salon.id}?v=${salon.coverUpdatedAt.getTime()}`
        : null,
    })),
  });
}

export async function PATCH(req: Request) {
  const account = await getConsumerSession();
  const clientSession = await getClientSession();
  if (!account || !clientSession) {
    return NextResponse.json({ error: "Sign in to update your account." }, { status: 401 });
  }

  const parsed = profileSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid name and phone number." }, { status: 400 });
  }

  const phone = parsed.data.phone || null;
  const updated = await prisma.$transaction(async (tx) => {
    const next = await tx.consumerAccount.update({
      where: { id: account.id },
      data: { name: parsed.data.name, phone },
      select: { id: true, email: true, name: true, phone: true },
    });
    await tx.client.updateMany({
      where: {
        memberAt: { not: null },
        OR: [
          { accountId: account.id },
          { email: { equals: normalizeEmail(account.email), mode: "insensitive" } },
        ],
      },
      data: { name: parsed.data.name, phone, accountId: account.id },
    });
    return next;
  });

  const currentClient = await prisma.client.findUnique({
    where: { id: clientSession.clientId },
  });
  if (currentClient?.email) {
    await issueClientSession({ ...currentClient, accountId: account.id });
  }

  return NextResponse.json({ account: updated, message: "Profile updated." });
}
