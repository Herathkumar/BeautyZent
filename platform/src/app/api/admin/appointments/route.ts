import { NextResponse } from "next/server";
import { TZDate } from "@date-fns/tz";
import { getSession, isSalonStaff } from "@/lib/auth";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import { updateAppointmentStatus } from "@/lib/complete-appointment";
import { applyAutoNoShows } from "@/lib/no-show";
import { prisma } from "@/lib/prisma";
import {
  calendarDateInTz,
  upcomingCalendarDays,
  zonedStartOfDay,
} from "@/lib/salon-time";

function isAdmin(session: { role: string } | null) {
  return isSalonStaff(session?.role);
}

function toDate(d: { getTime: () => number }) {
  return new Date(d.getTime());
}

function monthRange(year: number, month: number, timeZone: string) {
  const startYmd = `${year}-${String(month).padStart(2, "0")}-01`;
  const start = toDate(zonedStartOfDay(startYmd, timeZone));
  const next =
    month === 12
      ? toDate(zonedStartOfDay(`${year + 1}-01-01`, timeZone))
      : toDate(
          zonedStartOfDay(
            `${year}-${String(month + 1).padStart(2, "0")}-01`,
            timeZone
          )
        );
  return { gte: start, lt: next };
}

function yearRange(year: number, timeZone: string) {
  return {
    gte: toDate(zonedStartOfDay(`${year}-01-01`, timeZone)),
    lt: toDate(zonedStartOfDay(`${year + 1}-01-01`, timeZone)),
  };
}

function dayRange(ymd: string, timeZone: string) {
  const next = upcomingCalendarDays(2, timeZone, ymd)[1]!;
  return {
    gte: toDate(zonedStartOfDay(ymd, timeZone)),
    lt: toDate(zonedStartOfDay(next, timeZone)),
  };
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salon = await prisma.salon.findUniqueOrThrow({
    where: { id: session!.salonId },
  });
  const timeZone = salon.timezone || "America/Toronto";

  const autoNoShows = await applyAutoNoShows(salon.id, timeZone);

  const url = new URL(req.url);
  const stylistId = url.searchParams.get("stylistId") || "";
  const day = url.searchParams.get("day") || "";
  const month = Number(url.searchParams.get("month") || 0);
  const year = Number(url.searchParams.get("year") || 0);
  const status = (url.searchParams.get("status") || "all").toLowerCase();
  const source = (url.searchParams.get("source") || "all").toUpperCase();
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days") || 14)));

  const todayYmd = calendarDateInTz(timeZone);
  let startsAt: { gte?: Date; lt?: Date; lte?: Date } = {};

  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    startsAt = dayRange(day, timeZone);
  } else if (year >= 2000 && year <= 2100 && month >= 1 && month <= 12) {
    startsAt = monthRange(year, month, timeZone);
  } else if (year >= 2000 && year <= 2100) {
    startsAt = yearRange(year, timeZone);
  } else if (status === "no_show" || status === "noshow") {
    // Past ~90 days through the usual upcoming window (includes same-day manual no-shows)
    const [y, m, d] = todayYmd.split("-").map(Number);
    const from = new TZDate(y!, m! - 1, d! - 90, 0, 0, 0, 0, timeZone);
    const endYmd = upcomingCalendarDays(14, timeZone, todayYmd)[13]!;
    const endNext = upcomingCalendarDays(2, timeZone, endYmd)[1]!;
    startsAt = {
      gte: toDate(from),
      lt: toDate(zonedStartOfDay(endNext, timeZone)),
    };
  } else {
    const endYmd = upcomingCalendarDays(days, timeZone, todayYmd)[days - 1]!;
    const endNext = upcomingCalendarDays(2, timeZone, endYmd)[1]!;
    startsAt = {
      gte: toDate(zonedStartOfDay(todayYmd, timeZone)),
      lt: toDate(zonedStartOfDay(endNext, timeZone)),
    };
  }

  const statusWhere =
    status === "open"
      ? { status: { in: ["BOOKED", "CHECKED_IN"] } }
      : status === "no_show" || status === "noshow"
        ? { status: "NO_SHOW" }
        : status === "completed"
          ? { status: "COMPLETED" }
          : status === "cancelled"
            ? { status: "CANCELLED" }
            : status === "booked"
              ? { status: "BOOKED" }
              : {};

  const sourceWhere =
    source === "WALK_IN" ||
    source === "ONLINE" ||
    source === "ADMIN" ||
    source === "PHONE"
      ? { source }
      : {};

  const appointments = await prisma.appointment.findMany({
    where: {
      salonId: salon.id,
      startsAt,
      ...(stylistId ? { stylistId } : {}),
      ...statusWhere,
      ...sourceWhere,
    },
    include: {
      client: true,
      service: true,
      stylist: true,
    },
    orderBy: { startsAt: "asc" },
  });

  const stylists = await prisma.stylist.findMany({
    where: { salonId: salon.id, active: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    appointments,
    stylists,
    timeZone,
    today: todayYmd,
    autoNoShows,
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const allowed = ["BOOKED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"];
  if (!body.id || !allowed.includes(body.status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const appt = await prisma.appointment.findFirst({
    where: { id: body.id, salonId: session!.salonId },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.status === "NO_SHOW" && !["BOOKED", "CHECKED_IN"].includes(appt.status)) {
    return NextResponse.json(
      { error: "Only open bookings can be marked no-show" },
      { status: 400 }
    );
  }

  const result = await updateAppointmentStatus({
    appointmentId: appt.id,
    status: body.status,
    chargedCents: body.chargedCents,
    tipCents: body.tipCents,
    chargedByUserId: session!.userId,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  await syncAppointmentToGoogle(result.appointment.id);
  return NextResponse.json({ appointment: result.appointment });
}
