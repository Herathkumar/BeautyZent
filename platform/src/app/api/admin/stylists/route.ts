import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAuthUrl, isGoogleConfigured } from "@/lib/calendar";
import { linkStylistToAllServices } from "@/lib/service-links";
import {
  createStylistLogin,
  resetStylistPassword,
  stylistEmailDomain,
} from "@/lib/stylist-accounts";
import { normalizeGender, stylistPhotoUrl } from "@/lib/stylist-photo";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const salon = await prisma.salon.findUnique({ where: { id: session.salonId } });
  const stylists = await prisma.stylist.findMany({
    where: { salonId: session.salonId },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    googleConfigured: isGoogleConfigured(),
    emailDomain: salon ? stylistEmailDomain(salon) : "fhsalon.ca",
    stylists: stylists.map((s) => {
      const hasPhoto = Boolean(s.photoUpdatedAt && s.photoMime);
      return {
        id: s.id,
        name: s.name,
        bio: s.bio,
        color: s.color,
        gender: s.gender,
        hasPhoto,
        photoUrl: stylistPhotoUrl({
          id: s.id,
          gender: s.gender,
          hasPhoto,
          photoUpdatedAt: s.photoUpdatedAt,
        }),
        active: s.active,
        loginEmail: s.user?.email || null,
        userId: s.user?.id || null,
        calendarConnected: Boolean(s.googleRefreshToken),
        googleConnectedAt: s.googleConnectedAt,
        connectUrl: getGoogleAuthUrl(s.id),
      };
    }),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();

  // Admin reset password for an existing stylist login
  if (body.action === "resetPassword") {
    if (!body.stylistId) {
      return NextResponse.json({ error: "stylistId required" }, { status: 400 });
    }
    const stylist = await prisma.stylist.findFirst({
      where: { id: body.stylistId, salonId: session.salonId },
      include: { user: true },
    });
    if (!stylist?.user) {
      return NextResponse.json({ error: "Stylist login not found" }, { status: 404 });
    }
    const password = await resetStylistPassword(stylist.user.id);
    return NextResponse.json({
      ok: true,
      loginEmail: stylist.user.email,
      temporaryPassword: password,
    });
  }

  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

  const salon = await prisma.salon.findUnique({ where: { id: session.salonId } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const gender = normalizeGender(body.gender);
  const stylist = await prisma.stylist.create({
    data: {
      salonId: session.salonId,
      name,
      bio: body.bio || null,
      color: body.color || "#6e4a38",
      gender,
      active: true,
    },
  });
  await linkStylistToAllServices(session.salonId, stylist.id);

  const domain = stylistEmailDomain(salon);
  const login = await createStylistLogin({
    salonId: session.salonId,
    stylistId: stylist.id,
    name,
    domain,
  });

  // Default Mon–Sat hours like seed
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    await prisma.stylistWeekHour.create({
      data: {
        stylistId: stylist.id,
        dayOfWeek,
        startHour: salon.openHour,
        endHour: salon.closeHour,
        isOff: dayOfWeek === 0,
      },
    });
  }

  return NextResponse.json({
    stylist: {
      id: stylist.id,
      name: stylist.name,
      bio: stylist.bio,
      color: stylist.color,
      active: stylist.active,
      loginEmail: login.email,
    },
    credentials: {
      email: login.email,
      temporaryPassword: login.password,
      note: "Share once with the stylist. They can change this on their phone under Account.",
    },
  });
}
