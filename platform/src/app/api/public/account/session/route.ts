import { NextResponse } from "next/server";
import { getConsumerSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const account = await getConsumerSession();
  if (!account) {
    return NextResponse.json({ signedIn: false, favoriteSalonIds: [] });
  }
  const favorites = await prisma.consumerFavorite.findMany({
    where: { accountId: account.id },
    select: { salonId: true },
  });
  return NextResponse.json({
    signedIn: true,
    account: {
      email: account.email,
      name: account.name,
    },
    favoriteSalonIds: favorites.map((item) => item.salonId),
  });
}
