import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { syncAppointmentToGoogle } from "@/lib/calendar";

const bodySchema = z.object({
  serviceId: z.string(),
  stylistId: z.string(),
  startsAt: z.string(),
  clientName: z.string().min(2),
  clientPhone: z.string().min(7),
  clientEmail: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const startsAt = new Date(data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }

  const service = await prisma.service.findFirst({
    where: { id: data.serviceId, salonId: salon.id, active: true },
  });
  const stylist = await prisma.stylist.findFirst({
    where: { id: data.stylistId, salonId: salon.id, active: true },
  });
  if (!service || !stylist) {
    return NextResponse.json({ error: "Invalid service or stylist" }, { status: 400 });
  }

  const link = await prisma.stylistService.findUnique({
    where: {
      stylistId_serviceId: { stylistId: stylist.id, serviceId: service.id },
    },
  });
  if (!link) {
    return NextResponse.json({ error: "Stylist does not offer this service" }, { status: 400 });
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
    return NextResponse.json({ error: "That time was just taken. Pick another slot." }, { status: 409 });
  }

  let client = await prisma.client.findFirst({
    where: {
      salonId: salon.id,
      OR: [
        { phone: data.clientPhone },
        ...(data.clientEmail ? [{ email: data.clientEmail }] : []),
      ],
    },
  });
  if (!client) {
    client = await prisma.client.create({
      data: {
        salonId: salon.id,
        name: data.clientName,
        phone: data.clientPhone,
        email: data.clientEmail || null,
      },
    });
  } else {
    client = await prisma.client.update({
      where: { id: client.id },
      data: {
        name: data.clientName,
        phone: data.clientPhone,
        email: data.clientEmail || client.email,
      },
    });
  }

  const appointment = await prisma.appointment.create({
    data: {
      salonId: salon.id,
      stylistId: stylist.id,
      serviceId: service.id,
      clientId: client.id,
      startsAt,
      endsAt,
      status: "BOOKED",
      source: "ONLINE",
      notes: data.notes || null,
    },
    include: { service: true, stylist: true, client: true },
  });

  const sync = await syncAppointmentToGoogle(appointment.id);

  return NextResponse.json({
    appointment: {
      id: appointment.id,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
      service: appointment.service.name,
      stylist: appointment.stylist.name,
      client: appointment.client.name,
    },
    calendarSync: sync,
  });
}
