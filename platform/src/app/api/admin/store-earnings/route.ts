import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { calcStylistPay, dollarsToCents } from "@/lib/pay";
import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  calendarDateInTz,
  mondayOfWeekContaining,
  weekDayKeys,
  zonedStartOfDay,
} from "@/lib/salon-time";
import {
  scheduledMinutesByDayForWeek,
  scheduledMinutesForStylist,
} from "@/lib/scheduled-hours";

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

/** Store cost = hourly + commission (tips are pass-through, not in profit). */
function stylistCostCents(pay: ReturnType<typeof calcStylistPay>) {
  return pay.hourlyPay + pay.commissionPay;
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
        startsAt: { gte: todayStart, lt: tomorrowStart },
      },
      include: {
        service: { select: { name: true, priceCents: true } },
        client: { select: { name: true } },
        stylist: {
          select: {
            id: true,
            name: true,
            payType: true,
            hourlyRateCents: true,
            commissionBps: true,
          },
        },
      },
      orderBy: { startsAt: "desc" },
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
      select: {
        id: true,
        name: true,
        payType: true,
        hourlyRateCents: true,
        commissionBps: true,
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const countedJobs = weekJobs.filter((j) => !j.excludedFromEarnings);

  const scheduledByStylist = new Map<string, Record<string, number>>();
  await Promise.all(
    stylists.map(async (s) => {
      const byDay = await scheduledMinutesByDayForWeek({
        stylistId: s.id,
        salonOpenHour: salon.openHour,
        salonCloseHour: salon.closeHour,
        timeZone,
        mondayYmd: monday,
      });
      scheduledByStylist.set(s.id, byDay);
    })
  );

  const byDay = days.map((ymd) => {
    const dayJobs = countedJobs.filter(
      (j) => calendarDateInTz(timeZone, j.startsAt) === ymd
    );
    const chargedCents = dayJobs.reduce(
      (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
      0
    );
    const tipCents = dayJobs.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);

    let stylistPayCents = 0; // hourly + commission only
    let stylistTotalPayCents = 0; // includes tips
    for (const s of stylists) {
      const sJobs = dayJobs.filter((j) => j.stylistId === s.id);
      const sCharged = sJobs.reduce(
        (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
        0
      );
      const sTips = sJobs.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);
      const minutes = scheduledByStylist.get(s.id)?.[ymd] ?? 0;
      const pay = calcStylistPay({
        payType: s.payType,
        hourlyRateCents: s.hourlyRateCents,
        commissionBps: s.commissionBps,
        chargedCentsTotal: sCharged,
        tipCentsTotal: sTips,
        workedMinutes: minutes,
      });
      stylistPayCents += stylistCostCents(pay);
      stylistTotalPayCents += pay.totalPay;
    }

    const revenueCents = chargedCents + tipCents;
    const profitCents = chargedCents - stylistPayCents;

    return {
      date: ymd,
      weekday: new Intl.DateTimeFormat("en-CA", {
        timeZone,
        weekday: "short",
      }).format(zonedStartOfDay(ymd, timeZone)),
      jobCount: dayJobs.length,
      chargedCents,
      tipCents,
      revenueCents,
      stylistPayCents,
      stylistTotalPayCents,
      profitCents,
      totalCents: revenueCents,
    };
  });

  const weekCharged = byDay.reduce((s, d) => s + d.chargedCents, 0);
  const weekTips = byDay.reduce((s, d) => s + d.tipCents, 0);
  const weekStylistPay = byDay.reduce((s, d) => s + d.stylistPayCents, 0);
  const weekStylistTotalPay = byDay.reduce((s, d) => s + d.stylistTotalPayCents, 0);
  const weekJobsCount = byDay.reduce((s, d) => s + d.jobCount, 0);
  const weekProfit = weekCharged - weekStylistPay;
  const weekPaid = payouts.reduce((s, p) => s + p.amountCents, 0);
  const weekOwed = Math.max(0, weekStylistTotalPay - weekPaid);

  const countedTodayJobs = todayJobs.filter((j) => !j.excludedFromEarnings);

  // Today pay (may be outside the viewed week)
  let todayStylistPay = 0;
  const todayStylists = new Map<string, (typeof todayJobs)[0]["stylist"]>();
  for (const j of countedTodayJobs) todayStylists.set(j.stylist.id, j.stylist);
  await Promise.all(
    [...todayStylists.values()].map(async (s) => {
      const sJobs = countedTodayJobs.filter((j) => j.stylist.id === s.id);
      const sCharged = sJobs.reduce(
        (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
        0
      );
      const sTips = sJobs.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);
      const minutes = await scheduledMinutesForStylist({
        stylistId: s.id,
        salonOpenHour: salon.openHour,
        salonCloseHour: salon.closeHour,
        timeZone,
        rangeStart: todayStart,
        rangeEnd: tomorrowStart,
      });
      const pay = calcStylistPay({
        payType: s.payType,
        hourlyRateCents: s.hourlyRateCents,
        commissionBps: s.commissionBps,
        chargedCentsTotal: sCharged,
        tipCentsTotal: sTips,
        workedMinutes: minutes,
      });
      todayStylistPay += stylistCostCents(pay);
    })
  );

  // Also include hourly for stylists with no jobs today but scheduled hours
  const todayStylistIds = new Set(todayStylists.keys());
  await Promise.all(
    stylists
      .filter((s) => !todayStylistIds.has(s.id))
      .map(async (s) => {
        const minutes = await scheduledMinutesForStylist({
          stylistId: s.id,
          salonOpenHour: salon.openHour,
          salonCloseHour: salon.closeHour,
          timeZone,
          rangeStart: todayStart,
          rangeEnd: tomorrowStart,
        });
        if (minutes <= 0) return;
        const pay = calcStylistPay({
          payType: s.payType,
          hourlyRateCents: s.hourlyRateCents,
          commissionBps: s.commissionBps,
          chargedCentsTotal: 0,
          tipCentsTotal: 0,
          workedMinutes: minutes,
        });
        todayStylistPay += stylistCostCents(pay);
      })
  );

  const todayCharged = countedTodayJobs.reduce(
    (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
    0
  );
  const todayTips = countedTodayJobs.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);
  const todayProfit = todayCharged - todayStylistPay;

  const byStylistMap = new Map<
    string,
    {
      stylistId: string;
      stylistName: string;
      chargedCents: number;
      tipCents: number;
      jobCount: number;
      stylistPayCents: number;
    }
  >();
  for (const s of stylists) {
    const sJobs = countedJobs.filter((j) => j.stylistId === s.id);
    const chargedCents = sJobs.reduce(
      (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
      0
    );
    const tipCents = sJobs.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);
    let minutes = 0;
    for (const ymd of days) minutes += scheduledByStylist.get(s.id)?.[ymd] ?? 0;
    const pay = calcStylistPay({
      payType: s.payType,
      hourlyRateCents: s.hourlyRateCents,
      commissionBps: s.commissionBps,
      chargedCentsTotal: chargedCents,
      tipCentsTotal: tipCents,
      workedMinutes: minutes,
    });
    if (sJobs.length === 0 && stylistCostCents(pay) === 0) continue;
    byStylistMap.set(s.id, {
      stylistId: s.id,
      stylistName: s.name,
      chargedCents,
      tipCents,
      jobCount: sJobs.length,
      stylistPayCents: stylistCostCents(pay),
    });
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

  const weeklyProfitGoalCents = salon.weeklyProfitGoalCents ?? 200_000;
  const goalProgress = Math.min(
    1,
    Math.max(0, weekProfit) / Math.max(1, weeklyProfitGoalCents)
  );

  let motivation = "Track store profit against your weekly goal.";
  if (goalProgress >= 1) motivation = "Weekly profit goal reached — strong week!";
  else if (weekProfit > 0) motivation = "Profit is building — keep the floor busy.";
  else if (weekCharged > 0) motivation = "Revenue is in — watch stylist pay vs charged.";
  else if (monday === thisMonday) motivation = "Fresh week. Completions will fill the ring.";
  else motivation = "Quiet week on record — browse another week or check activity.";

  return NextResponse.json({
    today,
    timeZone,
    motivation,
    week: {
      monday,
      prevWeek,
      nextWeek,
      canGoNext: monday < thisMonday,
      label: weekLabel,
      isCurrentWeek: monday === thisMonday,
    },
    goal: {
      weeklyProfitGoalCents,
      weekProfitCents: weekProfit,
      progress: goalProgress,
      remainingCents: Math.max(0, weeklyProfitGoalCents - Math.max(0, weekProfit)),
    },
    todaySummary: {
      chargedCents: todayCharged,
      tipCents: todayTips,
      revenueCents: todayCharged + todayTips,
      stylistPayCents: todayStylistPay,
      profitCents: todayProfit,
      totalCents: todayCharged + todayTips,
      jobCount: countedTodayJobs.length,
      voidedJobCount: todayJobs.length - countedTodayJobs.length,
    },
    weekSummary: {
      chargedCents: weekCharged,
      tipCents: weekTips,
      revenueCents: weekCharged + weekTips,
      stylistPayCents: weekStylistPay,
      profitCents: weekProfit,
      paidCents: weekPaid,
      owedCents: weekOwed,
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
    todayJobs: todayJobs.map((j) => ({
      id: j.id,
      startsAt: j.startsAt.toISOString(),
      chargedAt: j.chargedAt?.toISOString() || null,
      clientName: j.client.name,
      serviceName: j.service.name,
      stylistId: j.stylist.id,
      stylistName: j.stylist.name,
      chargedCents: j.chargedCents ?? j.service.priceCents,
      tipCents: j.tipCents ?? 0,
      excludedFromEarnings: j.excludedFromEarnings,
    })),
    stylists: stylists.map((s) => ({ id: s.id, name: s.name })),
  });
}

export async function PATCH(req: Request) {
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

  if (body.action !== "setWeeklyGoal") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const cents =
    typeof body.weeklyProfitGoalCents === "number"
      ? Math.round(body.weeklyProfitGoalCents)
      : dollarsToCents(
          typeof body.weeklyGoalDollars === "number" ||
            typeof body.weeklyGoalDollars === "string"
            ? body.weeklyGoalDollars
            : ""
        );
  if (cents == null || cents < 0) {
    return NextResponse.json({ error: "Invalid goal amount" }, { status: 400 });
  }

  const salon = await prisma.salon.update({
    where: { id: session.salonId },
    data: { weeklyProfitGoalCents: cents },
    select: { weeklyProfitGoalCents: true },
  });

  return NextResponse.json({ weeklyProfitGoalCents: salon.weeklyProfitGoalCents });
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
