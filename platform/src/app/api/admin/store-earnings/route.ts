import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  calendarDateInTz,
  mondayOfWeekContaining,
  weekDayKeys,
  zonedStartOfDay,
} from "@/lib/salon-time";

function toDate(d: { getTime: () => number }) {
  return new Date(d.getTime());
}

function reasonLabel(reason: string) {
  switch (reason) {
    case "LEAVE":
      return "Away / vacation";
    case "BREAK":
      return "Break";
    case "BLOCKED":
      return "Blocked";
    default:
      return reason || "Away";
  }
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const salon = await prisma.salon.findUniqueOrThrow({
    where: { id: session.salonId },
  });
  const timeZone = salon.timezone || "America/Toronto";
  const today = calendarDateInTz(timeZone);
  const url = new URL(req.url);
  const weekParam = url.searchParams.get("week") || today;
  const monday = mondayOfWeekContaining(weekParam, timeZone);
  const days = weekDayKeys(monday, timeZone);
  const weekEndExclusive = addCalendarDays(days[6]!, 1, timeZone);
  const weekStart = toDate(zonedStartOfDay(monday, timeZone));
  const weekEnd = toDate(zonedStartOfDay(weekEndExclusive, timeZone));

  const todayStart = toDate(zonedStartOfDay(today, timeZone));
  const tomorrowStart = toDate(
    zonedStartOfDay(addCalendarDays(today, 1, timeZone), timeZone)
  );

  const [weekJobs, todayJobs, payouts, leaveBlocks, stylists] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        salonId: session.salonId,
        status: "COMPLETED",
        startsAt: { gte: weekStart, lt: weekEnd },
      },
      include: {
        service: { select: { name: true, priceCents: true } },
        client: { select: { name: true } },
        stylist: { select: { id: true, name: true } },
      },
      orderBy: { startsAt: "desc" },
    }),
    prisma.appointment.findMany({
      where: {
        salonId: session.salonId,
        status: "COMPLETED",
        excludedFromEarnings: false,
        startsAt: { gte: todayStart, lt: tomorrowStart },
      },
      include: {
        service: { select: { priceCents: true } },
      },
    }),
    prisma.stylistPayout.findMany({
      where: {
        salonId: session.salonId,
        status: "PAID",
        OR: [
          { paidAt: { gte: weekStart, lt: weekEnd } },
          { createdAt: { gte: weekStart, lt: weekEnd } },
        ],
      },
      include: { stylist: { select: { id: true, name: true } } },
      orderBy: { paidAt: "desc" },
    }),
    prisma.stylistBlock.findMany({
      where: {
        status: "APPROVED",
        stylist: { salonId: session.salonId },
        startsAt: { lt: weekEnd },
        endsAt: { gt: weekStart },
      },
      include: { stylist: { select: { id: true, name: true } } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.stylist.findMany({
      where: { salonId: session.salonId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const countedJobs = weekJobs.filter((j) => !j.excludedFromEarnings);

  const byDay = days.map((ymd) => {
    const dayJobs = countedJobs.filter(
      (j) => calendarDateInTz(timeZone, j.startsAt) === ymd
    );
    const chargedCents = dayJobs.reduce(
      (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
      0
    );
    const tipCents = dayJobs.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);
    return {
      date: ymd,
      weekday: new Intl.DateTimeFormat("en-CA", {
        timeZone,
        weekday: "short",
      }).format(zonedStartOfDay(ymd, timeZone)),
      jobCount: dayJobs.length,
      chargedCents,
      tipCents,
      totalCents: chargedCents + tipCents,
    };
  });

  const weekCharged = byDay.reduce((s, d) => s + d.chargedCents, 0);
  const weekTips = byDay.reduce((s, d) => s + d.tipCents, 0);
  const weekJobsCount = byDay.reduce((s, d) => s + d.jobCount, 0);

  const todayCharged = todayJobs.reduce(
    (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
    0
  );
  const todayTips = todayJobs.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);

  const byStylistMap = new Map<
    string,
    { stylistId: string; stylistName: string; chargedCents: number; tipCents: number; jobCount: number }
  >();
  for (const j of countedJobs) {
    const cur = byStylistMap.get(j.stylistId) || {
      stylistId: j.stylistId,
      stylistName: j.stylist.name,
      chargedCents: 0,
      tipCents: 0,
      jobCount: 0,
    };
    cur.chargedCents += j.chargedCents ?? j.service.priceCents ?? 0;
    cur.tipCents += j.tipCents ?? 0;
    cur.jobCount += 1;
    byStylistMap.set(j.stylistId, cur);
  }

  type Activity = {
    id: string;
    kind: "JOB" | "PAYOUT" | "LEAVE";
    at: string;
    title: string;
    detail: string;
    amountCents: number | null;
    excluded?: boolean;
    appointmentId?: string;
    stylistName?: string;
  };

  const activities: Activity[] = [];

  for (const j of weekJobs) {
    const charged = j.chargedCents ?? j.service.priceCents ?? 0;
    const tip = j.tipCents ?? 0;
    activities.push({
      id: `job-${j.id}`,
      kind: "JOB",
      at: j.chargedAt?.toISOString() || j.startsAt.toISOString(),
      title: `${j.client.name} · ${j.service.name}`,
      detail: j.stylist.name,
      amountCents: charged + tip,
      excluded: j.excludedFromEarnings,
      appointmentId: j.id,
      stylistName: j.stylist.name,
    });
  }

  for (const p of payouts) {
    activities.push({
      id: `payout-${p.id}`,
      kind: "PAYOUT",
      at: (p.paidAt || p.createdAt).toISOString(),
      title: `Payout marked paid`,
      detail: p.stylist.name + (p.note ? ` · ${p.note}` : ""),
      amountCents: p.amountCents,
      stylistName: p.stylist.name,
    });
  }

  for (const b of leaveBlocks) {
    activities.push({
      id: `leave-${b.id}`,
      kind: "LEAVE",
      at: b.startsAt.toISOString(),
      title: reasonLabel(b.reason),
      detail: `${b.stylist.name}${b.note ? ` · ${b.note}` : ""} — reduces scheduled pay hours`,
      amountCents: null,
      stylistName: b.stylist.name,
    });
  }

  activities.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  const thisMonday = mondayOfWeekContaining(today, timeZone);
  const prevWeek = addCalendarDays(monday, -7, timeZone);
  const nextWeek = addCalendarDays(monday, 7, timeZone);
  const sunday = days[6]!;
  const weekLabel = `${new Intl.DateTimeFormat("en-CA", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(zonedStartOfDay(monday, timeZone))} – ${new Intl.DateTimeFormat("en-CA", {
    timeZone,
    month: "short",
    day: "numeric",
  }).format(zonedStartOfDay(sunday, timeZone))}`;

  return NextResponse.json({
    today,
    timeZone,
    week: {
      monday,
      prevWeek,
      nextWeek,
      canGoNext: monday < thisMonday,
      label: weekLabel,
      isCurrentWeek: monday === thisMonday,
    },
    todaySummary: {
      chargedCents: todayCharged,
      tipCents: todayTips,
      totalCents: todayCharged + todayTips,
      jobCount: todayJobs.length,
    },
    weekSummary: {
      chargedCents: weekCharged,
      tipCents: weekTips,
      totalCents: weekCharged + weekTips,
      jobCount: weekJobsCount,
      voidedJobCount: weekJobs.length - countedJobs.length,
    },
    days: byDay,
    byStylist: [...byStylistMap.values()].sort((a, b) =>
      a.stylistName.localeCompare(b.stylistName)
    ),
    activities,
    jobs: weekJobs.map((j) => ({
      id: j.id,
      startsAt: j.startsAt.toISOString(),
      chargedAt: j.chargedAt?.toISOString() || null,
      clientName: j.client.name,
      serviceName: j.service.name,
      stylistId: j.stylistId,
      stylistName: j.stylist.name,
      chargedCents: j.chargedCents ?? j.service.priceCents,
      tipCents: j.tipCents ?? 0,
      excludedFromEarnings: j.excludedFromEarnings,
    })),
    stylists,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action !== "setExcluded") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const appointmentId = String(body.appointmentId || "");
  if (!appointmentId) {
    return NextResponse.json({ error: "appointmentId required" }, { status: 400 });
  }

  const excluded = Boolean(body.excluded);
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, salonId: session.salonId, status: "COMPLETED" },
  });
  if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.appointment.update({
    where: { id: appt.id },
    data: excluded
      ? {
          excludedFromEarnings: true,
          excludedAt: new Date(),
          excludedByUserId: session.userId,
        }
      : {
          excludedFromEarnings: false,
          excludedAt: null,
          excludedByUserId: null,
        },
  });

  return NextResponse.json({
    ok: true,
    appointment: {
      id: updated.id,
      excludedFromEarnings: updated.excludedFromEarnings,
    },
  });
}
