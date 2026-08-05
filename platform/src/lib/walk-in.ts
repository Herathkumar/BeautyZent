import { addMinutes, isBefore } from "date-fns";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";
import {
  calendarDateInTz,
  dayOfWeekInTz,
  nowInTz,
  zonedDateTime,
} from "@/lib/salon-time";
import { getAvailableSlots } from "@/lib/slots";

function ceilToMinutes(d: Date, stepMin: number) {
  const ms = stepMin * 60_000;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

async function isFreeWindow(opts: {
  stylistId: string;
  startsAt: Date;
  endsAt: Date;
  open: Date;
  close: Date;
}) {
  if (opts.startsAt < opts.open || opts.endsAt > opts.close) return false;
  const [conflict, block] = await Promise.all([
    prisma.appointment.findFirst({
      where: {
        stylistId: opts.stylistId,
        // Completed frees the chair for the next walk-in
        status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
        startsAt: { lt: opts.endsAt },
        endsAt: { gt: opts.startsAt },
      },
      select: { id: true },
    }),
    prisma.stylistBlock.findFirst({
      where: {
        stylistId: opts.stylistId,
        status: { in: ["PENDING", "APPROVED"] },
        startsAt: { lt: opts.endsAt },
        endsAt: { gt: opts.startsAt },
      },
      select: { id: true },
    }),
  ]);
  return !conflict && !block;
}

async function dayHours(
  salon: { openHour: number; closeHour: number; timezone: string },
  stylistId: string,
  ymd: string
) {
  const timeZone = salon.timezone || "America/Toronto";
  const dayOfWeek = dayOfWeekInTz(ymd, timeZone);
  const weekHour = await prisma.stylistWeekHour.findUnique({
    where: { stylistId_dayOfWeek: { stylistId, dayOfWeek } },
  });
  if (weekHour?.isOff) return null;
  const open = zonedDateTime(
    ymd,
    weekHour?.startHour ?? salon.openHour,
    weekHour?.startMinute ?? 0,
    timeZone
  );
  const close = zonedDateTime(
    ymd,
    weekHour?.endHour ?? salon.closeHour,
    weekHour?.endMinute ?? 0,
    timeZone
  );
  if (!isBefore(open, close)) return null;
  return { open: new Date(open.getTime()), close: new Date(close.getTime()), timeZone };
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
  const salon = await prisma.salon.findUniqueOrThrow({ where: { id: opts.salonId } });
  const service = await prisma.service.findFirst({
    where: { id: opts.serviceId, salonId: opts.salonId, active: true },
  });
  if (!service) return [];

  const timeZone = salon.timezone || "America/Toronto";
  const today = calendarDateInTz(timeZone);
  const now = new Date(nowInTz(timeZone).getTime());

  const stylists = await prisma.stylist.findMany({
    where: {
      salonId: opts.salonId,
      active: true,
      ...(opts.stylistId ? { id: opts.stylistId } : {}),
      services: { some: { serviceId: opts.serviceId } },
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const options: NextAvailableOption[] = [];

  for (const s of stylists) {
    const hours = await dayHours(salon, s.id, today);
    const step = Math.min(5, salon.slotMinutes || 30);
    const immediate = ceilToMinutes(now, step);

    const candidates: Date[] = [];
    if (hours && immediate >= hours.open && immediate < hours.close) {
      candidates.push(immediate);
    }

    if (hours) {
      const slots = await getAvailableSlots({
        salonId: opts.salonId,
        stylistId: s.id,
        serviceId: opts.serviceId,
        date: today,
      });
      for (const iso of slots) candidates.push(new Date(iso));
    }

    candidates.sort((a, b) => a.getTime() - b.getTime());

    let chosen: Date | null = null;
    for (const start of candidates) {
      if (start < now) continue;
      const end = addMinutes(start, service.durationMin);
      // Service may finish after posted close — only require start before close
      const withinHours =
        !hours || (start >= hours.open && start < hours.close);
      if (!withinHours) continue;
      const free = await isFreeWindow({
        stylistId: s.id,
        startsAt: start,
        endsAt: end,
        open: hours?.open ?? start,
        // Allow finishing past close for late walk-ins
        close: addMinutes(end, 1),
      });
      if (free) {
        chosen = start;
        break;
      }
    }

    // Floor override: if booked day is full / after hours, still seat now when chair is free
    if (!chosen) {
      const end = addMinutes(immediate, service.durationMin);
      const [conflict, block] = await Promise.all([
        prisma.appointment.findFirst({
          where: {
            stylistId: s.id,
            status: { notIn: ["CANCELLED", "NO_SHOW", "COMPLETED"] },
            startsAt: { lt: end },
            endsAt: { gt: immediate },
          },
          select: { id: true },
        }),
        prisma.stylistBlock.findFirst({
          where: {
            stylistId: s.id,
            status: { in: ["PENDING", "APPROVED"] },
            startsAt: { lt: end },
            endsAt: { gt: immediate },
          },
          select: { id: true },
        }),
      ]);
      if (!conflict && !block) chosen = immediate;
    }

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
    }),
    prisma.service.findFirst({
      where: { id: opts.serviceId, salonId: opts.salonId, active: true },
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

  const status = opts.status === "BOOKED" ? "BOOKED" : "CHECKED_IN";

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
    include: { client: true, service: true, stylist: true },
  });

  await syncAppointmentToGoogle(appointment.id);

  const timeZone = salon.timezone || "America/Toronto";
  const now = new Date(nowInTz(timeZone).getTime());
  const waitMinutes = Math.max(0, Math.round((startsAt.getTime() - now.getTime()) / 60_000));

  return { appointment, waitMinutes };
}

/** Waitlist rows with all seatable stylists for the service (for Seat now picker). */
export async function listWaitlistWithOptions(salonId: string) {
  const entries = await prisma.walkInWaitlist.findMany({
    where: { salonId, status: "WAITING" },
    include: {
      service: { select: { id: true, name: true, durationMin: true } },
      stylist: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

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
      const availableOptions = await findNextAvailableWalkIns({
        salonId,
        serviceId: e.serviceId,
      });
      const preferred = e.stylistId
        ? availableOptions.find((o) => o.stylistId === e.stylistId) || null
        : null;
      const nextAvailable = preferred || availableOptions[0] || null;
      const wait = nextAvailable?.waitMinutes ?? e.estimatedWaitMin;
      if (wait != null && wait !== e.estimatedWaitMin) {
        await prisma.walkInWaitlist.update({
          where: { id: e.id },
          data: { estimatedWaitMin: wait },
        });
      }
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

  let pick = options[0] || null;
  if (!chosenId && entry.stylistId) {
    pick =
      options.find((o) => o.stylistId === entry.stylistId) || options[0] || null;
  } else if (chosenId) {
    pick = options.find((o) => o.stylistId === chosenId) || null;
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
