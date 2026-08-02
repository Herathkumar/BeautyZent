import { NextResponse } from "next/server";
import { exchangeGoogleCode } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stylistId = url.searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!code || !stylistId) {
    return NextResponse.redirect(`${appUrl}/admin/stylists?error=missing_code`);
  }

  try {
    const tokens = await exchangeGoogleCode(code);
    if (!tokens.refresh_token) {
      return NextResponse.redirect(`${appUrl}/admin/stylists?error=no_refresh_token`);
    }
    await prisma.stylist.update({
      where: { id: stylistId },
      data: {
        googleRefreshToken: tokens.refresh_token,
        googleConnectedAt: new Date(),
        googleCalendarId: "primary",
      },
    });
    return NextResponse.redirect(`${appUrl}/admin/stylists?connected=1`);
  } catch (err) {
    console.error(err);
    return NextResponse.redirect(`${appUrl}/admin/stylists?error=oauth_failed`);
  }
}
