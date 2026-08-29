import { NextResponse } from "next/server";
import { getConsumerSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ salonId: string }> }
) {
  const account = await getConsumerSession();
  if (!account) {
    return NextResponse.json({ error: "Sign in to save favorites." }, { status: 401 });
  }

  const { salonId } = await params;
  const salon = await prisma.salon.findFirst({
    where: { id: salonId, active: true, listingStatus: "PUBLISHED" },
    select: { id: true },
  });
  if (!salon) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  await prisma.consumerFavorite.upsert({
    where: { accountId_salonId: { accountId: account.id, salonId } },
    create: { accountId: account.id, salonId },
    update: {},
  });
  return NextResponse.json({ ok: true, favorite: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ salonId: string }> }
) {
  const account = await getConsumerSession();
  if (!account) {
    return NextResponse.json({ error: "Sign in to manage favorites." }, { status: 401 });
  }

  const { salonId } = await params;
  await prisma.consumerFavorite.deleteMany({
    where: { accountId: account.id, salonId },
  });
  return NextResponse.json({ ok: true, favorite: false });
}
