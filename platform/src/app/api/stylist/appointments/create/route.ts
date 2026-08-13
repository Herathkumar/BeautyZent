import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { z } from "zod";
import { getStylistSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncAppointmentToGoogle } from "@/lib/calendar";

const schema = z.object({
  /** Target chair — self or another stylist in the salon (phone bookings). */
  stylistId: z.string(),
  serviceId: z.string(),
  startsAt: z.string(),
  clientName: z.string().min(2),
  clientPhone: z.string().min(7),
  clientEmail: z.string().optional(),
  notes: z.string().optional(),
});

/** Stylist books a future slot for a client — on their chair or a teammate's. */
export async function POST(req: Request) {
  const session = await getStylistSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const startsAt = new Date(data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }

  const [stylist, service] = await Promise.all([
    prisma.stylist.findFirst({
      where: { id: data.stylistId, salonId: session.salonId, active: true },
      include: { services: { select: { serviceId: true } } },
    }),
    prisma.service.findFirst({
      where: { id: data.serviceId, salonId: session.salonId, active: true },
    }),
  ]);
  if (!stylist || !service) {
    return NextResponse.json({ error: "Invalid stylist or service" }, { status: 400 });
  }
  if (!stylist.services.some((s) => s.serviceId === service.id)) {
    return NextResponse.json(
      { error: "That stylist is not linked to this service" },
      { status: 400 }
    );
  }

  const endsAt = addMinutes(startsAt, service.durationMin);
  const conflict = await prisma.appointment.findFirst({
    where: {
      stylistId: stylist.id,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { lt: endsAt },
      endsAt: { gt: startsAt },
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "That stylist is already booked at that time" },
      { status: 409 }
    );
  }

  let client = await prisma.client.findFirst({
    where: {
      salonId: session.salonId,
      OR: [
        { phone: data.clientPhone },
        ...(data.clientEmail ? [{ email: data.clientEmail }] : []),
      ],
    },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        salonId: session.salonId,
        name: data.clientName,
        phone: data.clientPhone,
        email: data.clientEmail || null,
      },
    });
  } else if (data.clientName.trim() && data.clientName.trim() !== client.name) {
    client = await prisma.client.update({
      where: { id: client.id },
      data: { name: data.clientName.trim() },
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      salonId: session.salonId,
      stylistId: stylist.id,
      serviceId: service.id,
      clientId: client.id,
      startsAt,
      endsAt,
      status: "BOOKED",
      source: "PHONE",
      notes: data.notes || null,
    },
    include: { client: true, service: true, stylist: true },
  });

  await syncAppointmentToGoogle(appointment.id);
  return NextResponse.json({ appointment });
}
