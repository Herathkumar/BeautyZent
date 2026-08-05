import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getGoogleAuthUrl, isGoogleConfigured } from "@/lib/calendar";
import { linkStylistToAllServices } from "@/lib/service-links";
import { normalizePayType } from "@/lib/pay";
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
    include: { user: { select: { id: true, email: true, role: true } } },
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
        selfManageSchedule: s.selfManageSchedule,
        payType: s.payType,
        hourlyRateCents: s.hourlyRateCents,
        commissionBps: s.commissionBps,
        loginEmail: s.user?.email || null,
        userId: s.user?.id || null,
        userRole: s.user?.role || null,
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
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "setActive") {
    const stylistId = String(body.stylistId || "");
    if (!stylistId) {
      return NextResponse.json({ error: "stylistId required" }, { status: 400 });
    }
    if (!isSalonStaff(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const stylist = await prisma.stylist.findFirst({
      where: { id: stylistId, salonId: session.salonId },
    });
    if (!stylist) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const active = Boolean(body.active);
    const updated = await prisma.stylist.update({
      where: { id: stylist.id },
      data: { active },
    });
    return NextResponse.json({
      stylist: updated,
      message: active
        ? `${stylist.name} is enabled again for booking and the floor.`
        : `${stylist.name} is disabled. They won't appear for booking or on the floor.`,
    });
  }

  if (body.action === "remove") {
    const stylistId = String(body.stylistId || "");
    if (!stylistId) {
      return NextResponse.json({ error: "stylistId required" }, { status: 400 });
    }
    if (!isSalonStaff(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const stylist = await prisma.stylist.findFirst({
      where: { id: stylistId, salonId: session.salonId },
      include: { user: { select: { id: true, role: true, email: true } } },
    });
    if (!stylist) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.$transaction(async (tx) => {
      await tx.stylist.update({
        where: { id: stylist.id },
        data: { active: false },
      });
      if (stylist.user) {
        if (stylist.user.role === "STYLIST") {
          await tx.user.delete({ where: { id: stylist.user.id } });
        } else {
          await tx.user.update({
            where: { id: stylist.user.id },
            data: { stylistId: null },
          });
        }
      }
    });

    return NextResponse.json({
      ok: true,
      message: `${stylist.name} was removed from booking and the floor. Past appointments are kept.`,
    });
  }

  if (body.action === "updateSelfManage" || body.action === "updatePay") {
    const stylistId = String(body.stylistId || "");
    if (!stylistId) {
      return NextResponse.json({ error: "stylistId required" }, { status: 400 });
    }
    if (!isSalonStaff(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const stylist = await prisma.stylist.findFirst({
      where: { id: stylistId, salonId: session.salonId },
    });
    if (!stylist) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const data: {
      selfManageSchedule?: boolean;
      payType?: string;
      hourlyRateCents?: number | null;
      commissionBps?: number | null;
    } = {};

    if (body.selfManageSchedule !== undefined) {
      data.selfManageSchedule = Boolean(body.selfManageSchedule);
    }
    if (body.action === "updatePay") {
      if (body.payType !== undefined) data.payType = normalizePayType(body.payType);
      if (body.hourlyRateCents !== undefined) {
        data.hourlyRateCents =
          body.hourlyRateCents === "" || body.hourlyRateCents == null
            ? null
            : Math.round(Number(body.hourlyRateCents));
      }
      if (body.commissionBps !== undefined) {
        data.commissionBps =
          body.commissionBps === "" || body.commissionBps == null
            ? null
            : Math.round(Number(body.commissionBps));
      }
    }

    const updated = await prisma.stylist.update({
      where: { id: stylist.id },
      data,
    });
    return NextResponse.json({ stylist: updated });
  }

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
      bio: body.bio ? String(body.bio) : null,
      color: body.color ? String(body.color) : "#6e4a38",
      gender,
      active: true,
      selfManageSchedule: Boolean(body.selfManageSchedule),
      payType: normalizePayType(body.payType),
      hourlyRateCents:
        body.hourlyRateCents === "" || body.hourlyRateCents == null
          ? null
          : Math.round(Number(body.hourlyRateCents)),
      commissionBps:
        body.commissionBps === "" || body.commissionBps == null
          ? 5000
          : Math.round(Number(body.commissionBps)),
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

  // Default week hours from store open/close + store off days
  const closedDays = new Set(
    Array.isArray(salon.closedDays) && salon.closedDays.length > 0
      ? salon.closedDays
      : [0]
  );
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    await prisma.stylistWeekHour.create({
      data: {
        stylistId: stylist.id,
        dayOfWeek,
        startHour: salon.openHour,
        endHour: salon.closeHour,
        isOff: closedDays.has(dayOfWeek),
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
