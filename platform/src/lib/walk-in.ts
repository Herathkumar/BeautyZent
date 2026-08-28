import { addMinutes } from "date-fns";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import {
  calendarDateInTz,
  dayOfWeekInTz,
  nowInTz,
  zonedDateTime,
} from "@/lib/salon-time";
import { isE2eFixtureStylist } from "@/lib/display-schedule";
import { stylistChairOccupied } from "@/lib/complete-appointment";

function ceilToMinutes(d: Date, stepMin: number) {
  const ms = stepMin * 60_000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

function nextFreeStart(
  immediate: Date,
  durationMin: number,
  step: number,
  open: Date | null,
  latestStart: Date,
  busy: { startsAt: Date; endsAt: Date }[]
) {
  let gapStart = immediate;
  if (open && gapStart < open) gapStart = ceilToMinutes(open, step);
  const intervals = [...busy].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  for (const job of intervals) {
    if (gapStart >= latestStart) return null;
    const trialEnd = addMinutes(gapStart, durationMin);
    if (trialEnd <= job.startsAt) break;
    if (job.endsAt > gapStart) {
      gapStart = ceilToMinutes(job.endsAt, step);
    }
  }
  return gapStart < latestStart ? gapStart : null;
}

export type NextAvailableOption = {
  stylistId: string;
  stylistName: string;
  startsAt: string;
  endsAt: string;
  waitMinutes: number;
};

/** Next free walk-in start for one or all stylists who offer the service. */
export async function findNextAvailableWalkIns(opts: {
  salonId: string;
  serviceId: string;
  stylistId?: string | null;
}): Promise<NextAvailableOption[]> {
  const salon = await prisma.salon.findUniqueOrThrow({
    where: { id: opts.salonId },
    select: {
      id: true,
      timezone: true,
      openHour: true,
      closeHour: true,
      slotMinutes: true,
    },
  });
  const service = await prisma.service.findFirst({
    where: { id: opts.serviceId, salonId: opts.salonId, active: true },
    select: { id: true, durationMin: true },
  });
  if (!service) return [];

  const timeZone = salon.timezone || "America/Toronto";
  const today = calendarDateInTz(timeZone);
  const now = new Date(nowInTz(timeZone).getTime());
  const dayOfWeek = dayOfWeekInTz(today, timeZone);
  const step = Math.min(5, salon.slotMinutes || 30);
  const immediate = ceilToMinutes(now, step);

  const stylists = await prisma.stylist.findMany({
    where: {
      salonId: opts.salonId,
      active: true,
      ...(opts.stylistId ? { id: opts.stylistId } : {}),
      services: { some: { serviceId: opts.serviceId } },
    },
    select: { id: true, name: true, bio: true },
    orderBy: { name: "asc" },
  });
  const floor = stylists.filter((row) => !isE2eFixtureStylist(row));
  if (floor.length === 0) return [];
  const stylistIds = floor.map((s) => s.id);

  const [weekHours, busyJobs, blocks] = await Promise.all([
    prisma.stylistWeekHour.findMany({
      where: { stylistId: { in: stylistIds }, dayOfWeek },
    }),
    prisma.appointment.findMany({
      where: {
        stylistId: { in: stylistIds },
        status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
        endsAt: { gt: immediate },
      },
      select: { stylistId: true, startsAt: true, endsAt: true },
      orderBy: { startsAt: "asc" },
    }),
    prisma.stylistBlock.findMany({
      where: {
        stylistId: { in: stylistIds },
        status: { in: ["PENDING", "APPROVED"] },
        endsAt: { gt: immediate },
      },
      select: { stylistId: true, startsAt: true, endsAt: true },
    }),
  ]);

  const weekByStylist = new Map(weekHours.map((row) => [row.stylistId, row]));
  const busyByStylist = new Map<string, { startsAt: Date; endsAt: Date }[]>();
  for (const id of stylistIds) busyByStylist.set(id, []);
  for (const job of busyJobs) busyByStylist.get(job.stylistId)?.push(job);
  for (const block of blocks) busyByStylist.get(block.stylistId)?.push(block);

  const options: NextAvailableOption[] = [];
  const endOfDay = zonedDateTime(today, 23, 55, timeZone);

  for (const s of floor) {
    const weekHour = weekByStylist.get(s.id);
    const hours =
      weekHour?.isOff
        ? null
        : (() => {
            const open = zonedDateTime(
              today,
              weekHour?.startHour ?? salon.openHour,
              weekHour?.startMinute ?? 0,
              timeZone
            );
            const close = zonedDateTime(
              today,
              weekHour?.endHour ?? salon.closeHour,
              weekHour?.endMinute ?? 0,
              timeZone
            );
            if (!(open.getTime() < close.getTime())) return null;
            return { open: new Date(open.getTime()), close: new Date(close.getTime()) };
          })();
    const postedLatest = hours
      ? addMinutes(hours.close, 60)
      : addMinutes(immediate, 60);
    const latestStart =
      endOfDay.getTime() > postedLatest.getTime() ? endOfDay : postedLatest;
    const chosen = nextFreeStart(
      immediate,
      service.durationMin,
      step,
      hours?.open ?? null,
      latestStart,
      busyByStylist.get(s.id) || []
    );
    if (!chosen) continue;
    const endsAt = addMinutes(chosen, service.durationMin);
    const waitMinutes = Math.max(0, Math.round((chosen.getTime() - now.getTime()) / 60_000));
    options.push({
      stylistId: s.id,
      stylistName: s.name,
      startsAt: chosen.toISOString(),
      endsAt: endsAt.toISOString(),
      waitMinutes,
    });
  }

  options.sort((a, b) => a.waitMinutes - b.waitMinutes || a.stylistName.localeCompare(b.stylistName));
  return options;
}

export async function createWalkInAppointment(opts: {
  salonId: string;
  stylistId: string;
  serviceId: string;
  clientName: string;
  clientPhone?: string | null;
  notes?: string | null;
  /** When omitted, uses next available for that stylist+service */
  startsAt?: Date | null;
  /**
   * Direct seat defaults to CHECKED_IN (guest is here).
   * Waitlist "Seat now" uses BOOKED so floor can Check in → Done + payment.
   */
  status?: "BOOKED" | "CHECKED_IN";
}) {
  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: opts.salonId } });
  const [stylist, service] = await Promise.all([
    prisma.stylist.findFirst({
      where: { id: opts.stylistId, salonId: opts.salonId, active: true },
      select: { id: true, name: true },
    }),
    prisma.service.findFirst({
      where: { id: opts.serviceId, salonId: opts.salonId, active: true },
      select: { id: true, name: true, durationMin: true },
    }),
  ]);
  if (!stylist || !service) {
    return { error: "Invalid stylist or service", status: 400 as const };
  }

  let startsAt = opts.startsAt || null;
  if (!startsAt) {
    const next = await findNextAvailableWalkIns({
      salonId: opts.salonId,
      serviceId: opts.serviceId,
      stylistId: opts.stylistId,
    });
    if (!next[0]) {
      return { error: "No open walk-in slot today for this stylist", status: 409 as const };
    }
    startsAt = new Date(next[0].startsAt);
  }

  const endsAt = addMinutes(startsAt, service.durationMin);
  const conflict = await prisma.appointment.findFirst({
    where: {
      stylistId: stylist.id,
      status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (conflict) {
    return { error: "Stylist already booked at that time", status: 409 as const };
  }

  const status = opts.status === "BOOKED" ? "BOOKED" : "CHECKED_IN";
  if (status === "CHECKED_IN") {
    const seated = await stylistChairOccupied({
      salonId: opts.salonId,
      stylistId: stylist.id,
    });
    if (seated) {
      return {
        error: "That stylist already has a client in the chair",
        status: 409 as const,
      };
    }
  }

  const name = opts.clientName.trim() || "Walk-in";
  const phone = (opts.clientPhone || "").trim() || null;

  let client =
    phone
      ? await prisma.client.findFirst({
          where: { salonId: opts.salonId, phone },
        })
      : null;
  if (!client) {
    client = await prisma.client.create({
      data: {
        salonId: opts.salonId,
        name,
        phone,
      },
    });
  } else if (client.name !== name) {
    client = await prisma.client.update({
      where: { id: client.id },
      data: { name },
    });
  }

  // Never include image/photo Bytes — they balloon JSON and freeze the floor on "Seating…"
  const appointment = await prisma.appointment.create({
    data: {
      salonId: opts.salonId,
      stylistId: stylist.id,
      serviceId: service.id,
      clientId: client.id,
      startsAt,
      endsAt,
      status,
      source: "WALK_IN",
      notes: opts.notes || null,
    },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: {
        select: { id: true, name: true, durationMin: true, priceCents: true },
      },
      stylist: { select: { id: true, name: true } },
    },
  });

  // Fire-and-forget; calendar.ts avoids Bytes. Skip entirely when OAuth isn't configured.
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    setTimeout(() => {
      void syncAppointmentToGoogle(appointment.id).catch(() => null);
    }, 0);
  }

  const timeZone = salon.timezone || "America/Toronto";
  const now = new Date(nowInTz(timeZone).getTime());
  const waitMinutes = Math.max(0, Math.round((startsAt.getTime() - now.getTime()) / 60_000));

  return { appointment, waitMinutes };
}

/** Waitlist rows with all seatable stylists for the service (for Seat now picker). */
export async function listWaitlistWithOptions(
  salonId: string,
  opts?: { includeOptions?: boolean }
) {
  const entries = await prisma.walkInWaitlist.findMany({
    where: { salonId, status: "WAITING" },
    include: {
      service: { select: { id: true, name: true, durationMin: true } },
      stylist: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!opts?.includeOptions) {
    return entries.map((e) => ({
      ...e,
      nextAvailable: null,
      availableOptions: [] as NextAvailableOption[],
    }));
  }

  const optionsByService = new Map<string, Promise<NextAvailableOption[]>>();
  const optionsFor = (serviceId: string) => {
    let pending = optionsByService.get(serviceId);
    if (!pending) {
      pending = findNextAvailableWalkIns({ salonId, serviceId });
      optionsByService.set(serviceId, pending);
    }
    return pending;
  };

  return Promise.all(
    entries.map(async (e) => {
      if (!e.serviceId) {
        return {
          ...e,
          estimatedWaitMin: e.estimatedWaitMin,
          nextAvailable: null,
          availableOptions: [] as NextAvailableOption[],
        };
      }
      const availableOptions = await optionsFor(e.serviceId);
      const preferred = e.stylistId
        ? availableOptions.find((o) => o.stylistId === e.stylistId) || null
        : null;
      const nextAvailable = preferred || availableOptions[0] || null;
      const wait = nextAvailable?.waitMinutes ?? e.estimatedWaitMin;
      return {
        ...e,
        estimatedWaitMin: wait,
        nextAvailable,
        availableOptions,
      };
    })
  );
}

/** Seat a waitlist guest with a chosen stylist (or next available). */
export async function seatWaitlistGuest(opts: {
  salonId: string;
  entryId: string;
  /** When set, seat with this stylist; otherwise next available (honors preference if still free). */
  stylistId?: string | null;
}) {
  const entry = await prisma.walkInWaitlist.findFirst({
    where: { id: opts.entryId, salonId: opts.salonId },
  });
  if (!entry) return { error: "Not found", status: 404 as const };
  if (entry.status !== "WAITING") {
    return { error: "Guest is not waiting", status: 400 as const };
  }
  if (!entry.serviceId) {
    return { error: "Assign a service before seating", status: 400 as const };
  }

  const chosenId = (opts.stylistId || "").trim() || null;
  const options = await findNextAvailableWalkIns({
    salonId: opts.salonId,
    serviceId: entry.serviceId,
    stylistId: chosenId,
  });

  let pick: NextAvailableOption | null = options[0] ?? null;
  if (!chosenId && entry.stylistId) {
    pick =
      options.find((o) => o.stylistId === entry.stylistId) ?? options[0] ?? null;
  } else if (chosenId) {
    pick = options.find((o) => o.stylistId === chosenId) ?? null;
  }

  if (!pick) {
    return { error: "No open slot to seat this guest yet", status: 409 as const };
  }

  const result = await createWalkInAppointment({
    salonId: opts.salonId,
    stylistId: pick.stylistId,
    serviceId: entry.serviceId,
    clientName: entry.clientName,
    clientPhone: entry.clientPhone,
    notes: entry.note,
    startsAt: new Date(pick.startsAt),
    status: "BOOKED",
  });
  if ("error" in result) return result;

  const updated = await prisma.walkInWaitlist.update({
    where: { id: entry.id },
    data: {
      status: "SEATED",
      seatedAt: new Date(),
      appointmentId: result.appointment.id,
      stylistId: result.appointment.stylistId,
      estimatedWaitMin: 0,
    },
    include: {
      service: { select: { id: true, name: true } },
      stylist: { select: { id: true, name: true } },
    },
  });

  return {
    entry: updated,
    appointment: result.appointment,
    waitMinutes: result.waitMinutes,
  };
}

export { sourceLabel } from "@/lib/appointment-source";
