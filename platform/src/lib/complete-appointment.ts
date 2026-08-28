import { earlySeatWindow } from "@/lib/display-schedule";
import { prisma } from "@/lib/prisma";

export async function stylistChairOccupied(opts: {
  salonId: string;
  stylistId: string;
  exceptAppointmentId?: string;
}) {
  return prisma.appointment.findFirst({
    where: {
      salonId: opts.salonId,
      stylistId: opts.stylistId,
      status: "CHECKED_IN",
      ...(opts.exceptAppointmentId ? { id: { not: opts.exceptAppointmentId } } : {}),
    },
    select: { id: true },
  });
}

/** Shared status update with service charge + tip when completing. */
export async function updateAppointmentStatus(opts: {
  appointmentId: string;
  status: string;
  chargedCents?: number | null;
  tipCents?: number | null;
  chargedByUserId?: string | null;
  discountCents?: number | null;
  discountLabel?: string | null;
  loyaltyPointsEarned?: number | null;
  loyaltyPointsRedeemed?: number | null;
}) {
  const data: {
    status: string;
    startsAt?: Date;
    endsAt?: Date;
    chargedCents?: number;
    tipCents?: number;
    chargedAt?: Date;
    chargedByUserId?: string | null;
    discountCents?: number;
    discountLabel?: string | null;
    loyaltyPointsEarned?: number;
    loyaltyPointsRedeemed?: number;
  } = { status: opts.status };

  if (opts.status === "CHECKED_IN") {
    const current = await prisma.appointment.findUnique({
      where: { id: opts.appointmentId },
      select: { status: true, startsAt: true, endsAt: true, stylistId: true, salonId: true },
    });
    if (current && current.status !== "CHECKED_IN") {
      const occupied = await stylistChairOccupied({
        salonId: current.salonId,
        stylistId: current.stylistId,
        exceptAppointmentId: opts.appointmentId,
      });
      if (occupied) {
        return {
          error: "That stylist already has a client in the chair",
          status: 409 as const,
        };
      }
      const shifted = earlySeatWindow(current.startsAt, current.endsAt);
      if (shifted) {
        data.startsAt = shifted.startsAt;
        data.endsAt = shifted.endsAt;
      }
    }
  }

  if (opts.status === "COMPLETED") {
    if (opts.chargedCents == null || !Number.isFinite(opts.chargedCents) || opts.chargedCents < 0) {
      return { error: "chargedCents required when completing", status: 400 as const };
    }
    const tip =
      opts.tipCents == null || !Number.isFinite(opts.tipCents) || opts.tipCents < 0
        ? 0
        : Math.round(opts.tipCents);
    data.chargedCents = Math.round(opts.chargedCents);
    data.tipCents = tip;
    data.chargedAt = new Date();
    data.chargedByUserId = opts.chargedByUserId ?? null;
    if (opts.discountCents != null && Number.isFinite(opts.discountCents)) {
      data.discountCents = Math.max(0, Math.round(opts.discountCents));
    }
    if (opts.discountLabel != null) data.discountLabel = opts.discountLabel;
    if (opts.loyaltyPointsEarned != null && Number.isFinite(opts.loyaltyPointsEarned)) {
      data.loyaltyPointsEarned = Math.max(0, Math.round(opts.loyaltyPointsEarned));
    }
    if (opts.loyaltyPointsRedeemed != null && Number.isFinite(opts.loyaltyPointsRedeemed)) {
      data.loyaltyPointsRedeemed = Math.max(0, Math.round(opts.loyaltyPointsRedeemed));
    }
  }

  // Never include image/photo Bytes — they hang JSON responses (Bookings / seating).
  const updated = await prisma.appointment.update({
    where: { id: opts.appointmentId },
    data,
    include: {
      client: { select: { id: true, name: true, phone: true } },
      service: {
        select: { id: true, name: true, durationMin: true, priceCents: true },
      },
      stylist: { select: { id: true, name: true } },
    },
  });

  return { appointment: updated };
}
