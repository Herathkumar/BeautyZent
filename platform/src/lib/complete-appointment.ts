import { prisma } from "@/lib/prisma";

/** Shared status update with optional charged amount when completing. */
export async function updateAppointmentStatus(opts: {
  appointmentId: string;
  status: string;
  chargedCents?: number | null;
  chargedByUserId?: string | null;
}) {
  const data: {
    status: string;
    chargedCents?: number;
    chargedAt?: Date;
    chargedByUserId?: string | null;
  } = { status: opts.status };

  if (opts.status === "COMPLETED") {
    if (opts.chargedCents == null || !Number.isFinite(opts.chargedCents) || opts.chargedCents < 0) {
      return { error: "chargedCents required when completing", status: 400 as const };
    }
    data.chargedCents = Math.round(opts.chargedCents);
    data.chargedAt = new Date();
    data.chargedByUserId = opts.chargedByUserId ?? null;
  }

  const updated = await prisma.appointment.update({
    where: { id: opts.appointmentId },
    data,
    include: {
      client: true,
      service: true,
      stylist: true,
    },
  });

  return { appointment: updated };
}
