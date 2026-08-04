import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { calcStylistPay, centsToDollars, dollarsToCents } from "@/lib/pay";
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
  if (url.searchParams.get("badge") === "1") {
    const unreadPayouts = await prisma.stylistPayout.count({
      where: {
        stylistId: stylist.id,
        status: "PAID",
        seenByStylistAt: null,
      },
    });
    return NextResponse.json({ unreadPayouts });
  }

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
    const tipCentsTotal = dayJobs.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);
    const workedMinutes = dayJobs.reduce(
      (sum, a) => sum + (a.service.durationMin || 0),
      0
    );
    const pay = calcStylistPay({
      payType: stylist.payType,
      hourlyRateCents: stylist.hourlyRateCents,
      commissionBps: stylist.commissionBps,
      chargedCentsTotal,
      tipCentsTotal,
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
      tipCentsTotal,
      workedMinutes,
      earningsCents: pay.totalPay,
      hourlyPay: pay.hourlyPay,
      commissionPay: pay.commissionPay,
      tipPay: pay.tipPay,
    };
  });

  const weekCharged = byDay.reduce((s, d) => s + d.chargedCentsTotal, 0);
  const weekTips = byDay.reduce((s, d) => s + d.tipCentsTotal, 0);
  const weekMinutes = byDay.reduce((s, d) => s + d.workedMinutes, 0);
  const weekPay = calcStylistPay({
    payType: stylist.payType,
    hourlyRateCents: stylist.hourlyRateCents,
    commissionBps: stylist.commissionBps,
    chargedCentsTotal: weekCharged,
    tipCentsTotal: weekTips,
    workedMinutes: weekMinutes,
  });

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
  const ytdTips = allCompleted.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);
  const ytdMinutes = allCompleted.reduce(
    (sum, a) => sum + (a.service.durationMin || 0),
    0
  );
  const ytdPay = calcStylistPay({
    payType: stylist.payType,
    hourlyRateCents: stylist.hourlyRateCents,
    commissionBps: stylist.commissionBps,
    chargedCentsTotal: ytdCharged,
    tipCentsTotal: ytdTips,
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
  const unreadPayouts = await prisma.stylistPayout.count({
    where: {
      stylistId: stylist.id,
      status: "PAID",
      seenByStylistAt: null,
    },
  });

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

  const weeklyGoalCents = stylist.weeklyGoalCents ?? 50_000;
  const goalProgress = Math.min(1, weekPay.totalPay / Math.max(1, weeklyGoalCents));

  let motivation = "Every completed service builds your week.";
  if (goalProgress >= 1) motivation = "Goal crushed — incredible week!";
  else if (weekPay.totalPay >= 50_000) motivation = "Strong week — keep that momentum going!";
  else if (weekPay.totalPay >= 20_000) motivation = "Nice pace. One more great day can push you higher.";
  else if (weekPay.totalPay > 0) motivation = "You're earning — consistency turns days into big weeks.";
  else if (monday === thisMonday) motivation = "Fresh week. Your next Done booking starts the chart.";
  else motivation = "Quiet week on record — check another week or keep booking.";

  return NextResponse.json({
    stylistName: stylist.name,
    payType: stylist.payType,
    paySettings: {
      payType: stylist.payType,
      hourlyRateCents: stylist.hourlyRateCents ?? 0,
      commissionBps: stylist.commissionBps ?? 0,
    },
    unreadPayouts,
    week: {
      monday,
      prevWeek,
      nextWeek,
      canGoNext,
      label: weekLabel,
      isCurrentWeek: monday === thisMonday,
    },
    goal: {
      weeklyGoalCents,
      weekEarningsCents: weekPay.totalPay,
      progress: goalProgress,
      remainingCents: Math.max(0, weeklyGoalCents - weekPay.totalPay),
    },
    summary: {
      weekEarningsCents: weekPay.totalPay,
      weekChargedCents: weekCharged,
      weekTipCents: weekTips,
      weekJobs: jobs.length,
      weekHours: Number((weekMinutes / 60).toFixed(1)),
      hourlyPayCents: weekPay.hourlyPay,
      commissionPayCents: weekPay.commissionPay,
      tipPayCents: weekPay.tipPay,
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
      tipCents: j.tipCents ?? 0,
      durationMin: j.service.durationMin,
    })),
    motivation,
    formatHint: centsToDollars(0),
  });
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || session.role !== "STYLIST" || !session.stylistId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.action === "markPayoutsSeen") {
    await prisma.stylistPayout.updateMany({
      where: {
        stylistId: session.stylistId,
        status: "PAID",
        seenByStylistAt: null,
      },
      data: { seenByStylistAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "setWeeklyGoal") {
    const cents =
      typeof body.weeklyGoalCents === "number"
        ? Math.round(body.weeklyGoalCents)
        : dollarsToCents(
            typeof body.weeklyGoalDollars === "number" ||
              typeof body.weeklyGoalDollars === "string"
              ? body.weeklyGoalDollars
              : ""
          );
    if (cents == null || cents < 0) {
      return NextResponse.json({ error: "Invalid goal amount" }, { status: 400 });
    }
    const stylist = await prisma.stylist.update({
      where: { id: session.stylistId },
      data: { weeklyGoalCents: cents },
    });
    return NextResponse.json({ weeklyGoalCents: stylist.weeklyGoalCents });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
