import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  addCalendarDays,
  calendarDateInTz,
  dayOfWeekInTz,
  zonedDateTime,
  zonedStartOfDay,
} from "@/lib/salon-time";

export const dynamic = "force-dynamic";

type Interval = { start: Date; end: Date };

function overlap(a: Interval, b: Interval): Interval | null {
  const start = a.start > b.start ? a.start : b.start;
  const end = a.end < b.end ? a.end : b.end;
  if (start >= end) return null;
  return { start, end };
}

function subtractBusy(work: Interval, busy: Interval[]): Interval[] {
  let free: Interval[] = [{ ...work }];
  for (const block of busy) {
    const next: Interval[] = [];
    for (const seg of free) {
      const hit = overlap(seg, block);
      if (!hit) {
        next.push(seg);
        continue;
      }
      if (seg.start < hit.start) next.push({ start: seg.start, end: hit.start });
      if (hit.end < seg.end) next.push({ start: hit.end, end: seg.end });
    }
    free = next;
  }
  return free;
}

function formatTime(d: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
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
  const url = new URL(req.url);
  const today = calendarDateInTz(timeZone);
  const date = url.searchParams.get("date") || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const dayOfWeek = dayOfWeekInTz(date, timeZone);
  const dayStart = zonedStartOfDay(date, timeZone);
  const nextDay = zonedStartOfDay(addCalendarDays(date, 1, timeZone), timeZone);
  const dayStartMs = dayStart.getTime();
  const nextDayMs = nextDay.getTime();

  const stylists = await prisma.stylist.findMany({
    where: { salonId: session.salonId, active: true },
    include: {
      weekHours: true,
      blocks: {
        where: {
          status: { in: ["PENDING", "APPROVED"] },
          startsAt: { lt: new Date(nextDayMs) },
          endsAt: { gt: new Date(dayStartMs) },
        },
        orderBy: { startsAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  const weekdayLabel = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(zonedDateTime(date, 12, 0, timeZone));

  const roster = stylists.map((s) => {
    const weekHour = s.weekHours.find((h) => h.dayOfWeek === dayOfWeek);
    const isOff = weekHour?.isOff ?? dayOfWeek === 0;
    const openHour = weekHour?.startHour ?? salon.openHour;
    const openMinute = weekHour?.startMinute ?? 0;
    const closeHour = weekHour?.endHour ?? salon.closeHour;
    const closeMinute = weekHour?.endMinute ?? 0;

    const scheduledStart = zonedDateTime(date, openHour, openMinute, timeZone);
    const scheduledEnd = zonedDateTime(date, closeHour, closeMinute, timeZone);
    const workValid = !isOff && scheduledStart.getTime() < scheduledEnd.getTime();

    const absences = s.blocks.map((b) => {
      const clipped = overlap(
        { start: scheduledStart, end: scheduledEnd },
        { start: b.startsAt, end: b.endsAt }
      );
      const coversFullDay =
        workValid &&
        clipped != null &&
        clipped.start.getTime() <= scheduledStart.getTime() &&
        clipped.end.getTime() >= scheduledEnd.getTime();
      return {
        id: b.id,
        reason: b.reason,
        reasonLabel: reasonLabel(b.reason),
        note: b.note,
        status: b.status,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt.toISOString(),
        startLabel: formatTime(b.startsAt, timeZone),
        endLabel: formatTime(b.endsAt, timeZone),
        clippedStartLabel: clipped ? formatTime(clipped.start, timeZone) : null,
        clippedEndLabel: clipped ? formatTime(clipped.end, timeZone) : null,
        coversFullDay,
      };
    });

    const fullDayAway = absences.some((a) => a.coversFullDay);

    let status: "WORKING" | "PARTIAL" | "AWAY" | "OFF" = "OFF";
    let summary = "Day off";
    let onFloor: { startLabel: string; endLabel: string }[] = [];

    if (!workValid) {
      status = "OFF";
      summary = "Day off";
    } else if (fullDayAway) {
      status = "AWAY";
      const away = absences.find((a) => a.coversFullDay)!;
      summary = `${away.reasonLabel}${away.status === "PENDING" ? " (pending)" : ""} — all day`;
    } else {
      const busy = s.blocks.map((b) => ({ start: b.startsAt, end: b.endsAt }));
      const free = subtractBusy(
        { start: scheduledStart, end: scheduledEnd },
        busy
      );
      onFloor = free.map((seg) => ({
        startLabel: formatTime(seg.start, timeZone),
        endLabel: formatTime(seg.end, timeZone),
      }));
      if (onFloor.length === 0) {
        status = "AWAY";
        summary = "Away all day";
      } else if (absences.length === 0) {
        status = "WORKING";
        summary = `${formatTime(scheduledStart, timeZone)} – ${formatTime(scheduledEnd, timeZone)}`;
      } else {
        status = "PARTIAL";
        summary = onFloor.map((s) => `${s.startLabel} – ${s.endLabel}`).join(", ");
      }
    }

    return {
      id: s.id,
      name: s.name,
      status,
      summary,
      scheduled:
        workValid
          ? {
              startLabel: formatTime(scheduledStart, timeZone),
              endLabel: formatTime(scheduledEnd, timeZone),
            }
          : null,
      onFloor,
      absences: absences.map((a) => ({
        id: a.id,
        reasonLabel: a.reasonLabel,
        note: a.note,
        status: a.status,
        startLabel: a.clippedStartLabel || a.startLabel,
        endLabel: a.clippedEndLabel || a.endLabel,
        coversFullDay: a.coversFullDay,
      })),
    };
  });

  const workingCount = roster.filter((r) => r.status === "WORKING" || r.status === "PARTIAL").length;
  const awayCount = roster.filter((r) => r.status === "AWAY").length;
  const offCount = roster.filter((r) => r.status === "OFF").length;

  return NextResponse.json({
    date,
    today,
    weekdayLabel,
    timeZone,
    counts: { working: workingCount, away: awayCount, off: offCount, total: roster.length },
    roster,
  });
}
