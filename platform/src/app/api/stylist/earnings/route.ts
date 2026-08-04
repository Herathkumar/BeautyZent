import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { calcStylistPay, centsToDollars } from "@/lib/pay";
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

export async function GET(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "STYLIST" || !session.stylistId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stylist = await prisma.stylist.findUnique({
    where: { id: session.stylistId },
  });
  if (!stylist) return NextResponse.json({ error: "Not found" }, { status: 404 });

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

  const jobs = await prisma.appointment.findMany({
    where: {
      stylistId: stylist.id,
      status: "COMPLETED",
      startsAt: { gte: weekStart, lt: weekEnd },
    },
    include: {
      service: { select: { name: true, durationMin: true, priceCents: true } },
      client: { select: { name: true } },
    },
    orderBy: { startsAt: "asc" },
  });

  const byDay = days.map((ymd) => {
    const dayJobs = jobs.filter(
      (j) => calendarDateInTz(timeZone, j.startsAt) === ymd
    );
    const chargedCentsTotal = dayJobs.reduce(
      (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
      0
    );
    const workedMinutes = dayJobs.reduce(
      (sum, a) => sum + (a.service.durationMin || 0),
      0
    );
    const pay = calcStylistPay({
      payType: stylist.payType,
      hourlyRateCents: stylist.hourlyRateCents,
      commissionBps: stylist.commissionBps,
      chargedCentsTotal,
      workedMinutes,
    });
    return {
      date: ymd,
      weekday: new Intl.DateTimeFormat("en-CA", {
        timeZone,
        weekday: "short",
      }).format(zonedStartOfDay(ymd, timeZone)),
      jobCount: dayJobs.length,
      chargedCentsTotal,
      workedMinutes,
      earningsCents: pay.totalPay,
      hourlyPay: pay.hourlyPay,
      commissionPay: pay.commissionPay,
    };
  });

  const weekCharged = byDay.reduce((s, d) => s + d.chargedCentsTotal, 0);
  const weekMinutes = byDay.reduce((s, d) => s + d.workedMinutes, 0);
  const weekPay = calcStylistPay({
    payType: stylist.payType,
    hourlyRateCents: stylist.hourlyRateCents,
    commissionBps: stylist.commissionBps,
    chargedCentsTotal: weekCharged,
    workedMinutes: weekMinutes,
  });

  // Lifetime / YTD for paid vs pending
  const year = Number(today.slice(0, 4));
  const yearStart = toDate(zonedStartOfDay(`${year}-01-01`, timeZone));
  const allCompleted = await prisma.appointment.findMany({
    where: {
      stylistId: stylist.id,
      status: "COMPLETED",
      startsAt: { gte: yearStart },
    },
    include: { service: { select: { durationMin: true, priceCents: true } } },
  });
  const ytdCharged = allCompleted.reduce(
    (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
    0
  );
  const ytdMinutes = allCompleted.reduce(
    (sum, a) => sum + (a.service.durationMin || 0),
    0
  );
  const ytdPay = calcStylistPay({
    payType: stylist.payType,
    hourlyRateCents: stylist.hourlyRateCents,
    commissionBps: stylist.commissionBps,
    chargedCentsTotal: ytdCharged,
    workedMinutes: ytdMinutes,
  });

  const payouts = await prisma.stylistPayout.findMany({
    where: {
      stylistId: stylist.id,
      status: "PAID",
      paidAt: { gte: yearStart },
    },
  });
  const paidCents = payouts.reduce((sum, p) => sum + p.amountCents, 0);
  const pendingCents = Math.max(0, ytdPay.totalPay - paidCents);

  const prevWeek = addCalendarDays(monday, -7, timeZone);
  const nextWeek = addCalendarDays(monday, 7, timeZone);
  const thisMonday = mondayOfWeekContaining(today, timeZone);
  const canGoNext = monday < thisMonday;

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

  let motivation = "Every completed service builds your week.";
  if (weekPay.totalPay >= 50_000) motivation = "Strong week — keep that momentum going!";
  else if (weekPay.totalPay >= 20_000) motivation = "Nice pace. One more great day can push you higher.";
  else if (weekPay.totalPay > 0) motivation = "You're earning — consistency turns days into big weeks.";
  else if (monday === thisMonday) motivation = "Fresh week. Your next Done booking starts the chart.";
  else motivation = "Quiet week on record — check another week or keep booking.";

  return NextResponse.json({
    stylistName: stylist.name,
    payType: stylist.payType,
    week: {
      monday,
      prevWeek,
      nextWeek,
      canGoNext,
      label: weekLabel,
      isCurrentWeek: monday === thisMonday,
    },
    summary: {
      weekEarningsCents: weekPay.totalPay,
      weekChargedCents: weekCharged,
      weekJobs: jobs.length,
      weekHours: Number((weekMinutes / 60).toFixed(1)),
      hourlyPayCents: weekPay.hourlyPay,
      commissionPayCents: weekPay.commissionPay,
      ytdEarningsCents: ytdPay.totalPay,
      paidCents,
      pendingCents,
    },
    days: byDay,
    jobs: jobs.map((j) => ({
      id: j.id,
      startsAt: j.startsAt,
      clientName: j.client.name,
      serviceName: j.service.name,
      chargedCents: j.chargedCents ?? j.service.priceCents,
      durationMin: j.service.durationMin,
    })),
    motivation,
    formatHint: centsToDollars(0),
  });
}
