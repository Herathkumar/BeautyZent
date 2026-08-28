import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { z } from "zod";
import { assertDisplayAccess } from "@/lib/display-pin";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  stylistId: z.string(),
  serviceId: z.string(),
  startsAt: z.string(),
  clientName: z.string().min(1),
  clientPhone: z.string().optional(),
  notes: z.string().optional(),
});

async function loadSalon(slug: string) {
  return prisma.salon.findUnique({
    where: { slug },
    select: { id: true, slug: true, displayPinHash: true, displayPinSetAt: true },
  });
}

/** Reception desk books a future slot for a client. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await loadSalon(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

  const parsed = schema.safeParse(await req.json().catch(() => null));
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
      where: { id: data.stylistId, salonId: salon.id, active: true },
      include: { services: { select: { serviceId: true } } },
    }),
    prisma.service.findFirst({
      where: { id: data.serviceId, salonId: salon.id, active: true },
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
    return NextResponse.json({ error: "Stylist already booked at that time" }, { status: 409 });
  }

  const phone = data.clientPhone?.trim() || null;
  let client = phone
    ? await prisma.client.findFirst({
        where: { salonId: salon.id, phone },
      })
    : null;
  if (!client) {
    client = await prisma.client.findFirst({
      where: {
        salonId: salon.id,
        name: { equals: data.clientName.trim(), mode: "insensitive" },
        ...(phone ? { phone } : {}),
      },
    });
  }
  if (!client) {
    client = await prisma.client.create({
      data: {
        salonId: salon.id,
        name: data.clientName.trim(),
        phone,
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
      salonId: salon.id,
      stylistId: stylist.id,
      serviceId: service.id,
      clientId: client.id,
      startsAt,
      endsAt,
      status: "BOOKED",
      source: "ADMIN",
      notes: data.notes?.trim() || null,
    },
    include: { client: true, service: true, stylist: true },
  });

  await syncAppointmentToGoogle(appointment.id);
  return NextResponse.json({ appointment });
}
