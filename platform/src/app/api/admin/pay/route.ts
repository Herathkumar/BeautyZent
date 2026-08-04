import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { calcStylistPay, normalizePayType } from "@/lib/pay";
import { prisma } from "@/lib/prisma";
import { calendarDateInTz, zonedStartOfDay } from "@/lib/salon-time";

function toDate(d: { getTime: () => number }) {
  return new Date(d.getTime());
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
  const url = new URL(req.url);
  const today = calendarDateInTz(timeZone);
  const [ty, tm] = today.split("-").map(Number);
  const year = Number(url.searchParams.get("year") || ty);
  const month = Number(url.searchParams.get("month") || tm);
  const stylistId = url.searchParams.get("stylistId") || "";

  const startYmd = `${year}-${String(month).padStart(2, "0")}-01`;
  const start = toDate(zonedStartOfDay(startYmd, timeZone));
  const nextMonth =
    month === 12
      ? toDate(zonedStartOfDay(`${year + 1}-01-01`, timeZone))
      : toDate(
          zonedStartOfDay(
            `${year}-${String(month + 1).padStart(2, "0")}-01`,
            timeZone
          )
        );

  const stylists = await prisma.stylist.findMany({
    where: {
      salonId: session.salonId,
      active: true,
      ...(stylistId ? { id: stylistId } : {}),
    },
    orderBy: { name: "asc" },
  });

  const reports = [];
  for (const s of stylists) {
    const completed = await prisma.appointment.findMany({
      where: {
        stylistId: s.id,
        status: "COMPLETED",
        startsAt: { gte: start, lt: nextMonth },
      },
      include: {
        service: { select: { name: true, durationMin: true, priceCents: true } },
        client: { select: { name: true } },
      },
      orderBy: { startsAt: "asc" },
    });

    const chargedCentsTotal = completed.reduce(
      (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
      0
    );
    const tipCentsTotal = completed.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);
    const workedMinutes = completed.reduce(
      (sum, a) => sum + (a.service.durationMin || 0),
      0
    );
    const pay = calcStylistPay({
      payType: s.payType,
      hourlyRateCents: s.hourlyRateCents,
      commissionBps: s.commissionBps,
      chargedCentsTotal,
      tipCentsTotal,
      workedMinutes,
    });

    const payouts = await prisma.stylistPayout.findMany({
      where: {
        stylistId: s.id,
        status: "PAID",
        periodStart: { gte: start, lt: nextMonth },
      },
      orderBy: { createdAt: "desc" },
    });
    const paidCents = payouts.reduce((sum, p) => sum + p.amountCents, 0);
    const earnedCents = pay.totalPay;
    const owedCents = Math.max(0, earnedCents - paidCents);

    reports.push({
      stylist: {
        id: s.id,
        name: s.name,
        payType: normalizePayType(s.payType),
        hourlyRateCents: s.hourlyRateCents,
        commissionBps: s.commissionBps,
        selfManageSchedule: s.selfManageSchedule,
      },
      jobs: completed.map((a) => ({
        id: a.id,
        startsAt: a.startsAt,
        clientName: a.client.name,
        serviceName: a.service.name,
        durationMin: a.service.durationMin,
        chargedCents: a.chargedCents ?? a.service.priceCents,
        tipCents: a.tipCents ?? 0,
      })),
      chargedCentsTotal,
      tipCentsTotal,
      workedMinutes,
      hourlyPay: pay.hourlyPay,
      commissionPay: pay.commissionPay,
      tipPay: pay.tipPay,
      totalPay: earnedCents,
      earnedCents,
      paidCents,
      owedCents,
      isPaid: owedCents <= 0 && earnedCents > 0,
      payouts,
    });
  }

  const pendingLeave = await prisma.stylistBlock.findMany({
    where: {
      status: "PENDING",
      stylist: { salonId: session.salonId },
      endsAt: { gte: new Date() },
    },
    include: { stylist: { select: { id: true, name: true } } },
    orderBy: { startsAt: "asc" },
  });

  return NextResponse.json({
    year,
    month,
    periodStart: start.toISOString(),
    periodEnd: nextMonth.toISOString(),
    reports,
    pendingLeave,
    stylists: await prisma.stylist.findMany({
      where: { salonId: session.salonId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body.stylistId || body.amountCents == null) {
    return NextResponse.json({ error: "stylistId and amountCents required" }, { status: 400 });
  }

  const stylist = await prisma.stylist.findFirst({
    where: { id: body.stylistId, salonId: session.salonId },
  });
  if (!stylist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const periodStart = new Date(body.periodStart);
  const periodEnd = new Date(body.periodEnd);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime())) {
    return NextResponse.json({ error: "Invalid period" }, { status: 400 });
  }

  // Recompute what is still owed for this period so we never double-pay.
  const completed = await prisma.appointment.findMany({
    where: {
      stylistId: stylist.id,
      status: "COMPLETED",
      startsAt: { gte: periodStart, lt: periodEnd },
    },
    include: { service: { select: { durationMin: true, priceCents: true } } },
  });
  const chargedCentsTotal = completed.reduce(
    (sum, a) => sum + (a.chargedCents ?? a.service.priceCents ?? 0),
    0
  );
  const tipCentsTotal = completed.reduce((sum, a) => sum + (a.tipCents ?? 0), 0);
  const workedMinutes = completed.reduce(
    (sum, a) => sum + (a.service.durationMin || 0),
    0
  );
  const earned = calcStylistPay({
    payType: stylist.payType,
    hourlyRateCents: stylist.hourlyRateCents,
    commissionBps: stylist.commissionBps,
    chargedCentsTotal,
    tipCentsTotal,
    workedMinutes,
  }).totalPay;
  const alreadyPaid = await prisma.stylistPayout.aggregate({
    where: {
      stylistId: stylist.id,
      status: "PAID",
      periodStart: { gte: periodStart, lt: periodEnd },
    },
    _sum: { amountCents: true },
  });
  const paidCents = alreadyPaid._sum.amountCents ?? 0;
  const owedCents = Math.max(0, earned - paidCents);
  if (owedCents <= 0) {
    return NextResponse.json(
      { error: "Nothing left to pay for this period." },
      { status: 400 }
    );
  }

  const requested = Math.round(Number(body.amountCents));
  const amountCents =
    Number.isFinite(requested) && requested > 0
      ? Math.min(requested, owedCents)
      : owedCents;

  const payout = await prisma.stylistPayout.create({
    data: {
      salonId: session.salonId,
      stylistId: stylist.id,
      periodStart,
      periodEnd,
      amountCents,
      note: body.note || null,
      status: "PAID",
      paidAt: new Date(),
    },
  });

  return NextResponse.json({
    payout,
    earnedCents: earned,
    paidCents: paidCents + amountCents,
    owedCents: Math.max(0, earned - paidCents - amountCents),
  });
}
