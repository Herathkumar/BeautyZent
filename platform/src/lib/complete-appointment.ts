import { prisma } from "@/lib/prisma";

/** Shared status update with service charge + tip when completing. */
export async function updateAppointmentStatus(opts: {
  appointmentId: string;
  status: string;
  chargedCents?: number | null;
  tipCents?: number | null;
  chargedByUserId?: string | null;
}) {
  const data: {
    status: string;
    chargedCents?: number;
    tipCents?: number;
    chargedAt?: Date;
    chargedByUserId?: string | null;
  } = { status: opts.status };

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
