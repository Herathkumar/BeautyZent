import { NextResponse } from "next/server";
import { addMinutes } from "date-fns";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { syncAppointmentToGoogle } from "@/lib/calendar";
import {
  ANY_STYLIST_ID,
  getClientSessionForSalon,
  normalizeEmail,
} from "@/lib/client-auth";
import { getAvailableSlots } from "@/lib/slots";
import { calendarDateInTz } from "@/lib/salon-time";
import { isE2eFixtureStylist } from "@/lib/display-schedule";
import { decodeStylePhoto, normalizeStylePrompt } from "@/lib/style-prefs";

const stylePrefSchema = z.object({
  imageBase64: z.string().min(20),
  mimeType: z.string().optional(),
  source: z.enum(["UPLOAD", "LOOKBOOK", "AI"]).optional(),
  prompt: z.string().optional(),
});

const bodySchema = z
  .object({
    serviceId: z.string().optional(),
    serviceIds: z.array(z.string()).min(1).optional(),
    stylistId: z.string(),
    startsAt: z.string(),
    clientName: z.string().min(2),
    clientPhone: z.string().min(7),
    clientEmail: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional(),
    saveAsMember: z.boolean().optional(),
    stylePref: stylePrefSchema.optional().nullable(),
  })
  .refine((d) => (d.serviceIds && d.serviceIds.length > 0) || d.serviceId, {
    message: "serviceId or serviceIds required",
  });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;
  const serviceIds = [
    ...new Set(
      (data.serviceIds?.length ? data.serviceIds : data.serviceId ? [data.serviceId] : []).filter(
        Boolean
      )
    ),
  ];
  const startsAt = new Date(data.startsAt);
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
  }

  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, salonId: salon.id, active: true },
  });
  if (services.length !== serviceIds.length) {
    return NextResponse.json({ error: "Invalid service" }, { status: 400 });
  }
  const byId = new Map(services.map((s) => [s.id, s]));
  const ordered = serviceIds.map((id) => byId.get(id)!);
  const totalDuration = ordered.reduce((sum, s) => sum + s.durationMin, 0);
  const totalPrice = ordered.reduce((sum, s) => sum + s.priceCents, 0);

  let stylistId = data.stylistId;
  if (stylistId === ANY_STYLIST_ID) {
    const ymd = calendarDateInTz(salon.timezone || "America/Toronto", startsAt);
    const links = await prisma.stylistService.findMany({
      where: {
        serviceId: { in: serviceIds },
        stylist: { salonId: salon.id, active: true },
      },
      select: { stylistId: true, serviceId: true },
    });
    const byStylist = new Map<string, Set<string>>();
    for (const link of links) {
      const set = byStylist.get(link.stylistId) || new Set();
      set.add(link.serviceId);
      byStylist.set(link.stylistId, set);
    }
    const eligibleIds = [...byStylist.entries()]
      .filter(([, set]) => serviceIds.every((id) => set.has(id)))
      .map(([id]) => id);
    const real = await prisma.stylist.findMany({
      where: { salonId: salon.id, id: { in: eligibleIds } },
      select: { id: true, name: true, bio: true },
    });
    const eligible = real.filter((s) => !isE2eFixtureStylist(s)).map((s) => s.id);

    const startMs = startsAt.getTime();
    let matched: string | null = null;
    for (const sid of eligible) {
      const slots = await getAvailableSlots({
        salonId: salon.id,
        stylistId: sid,
        serviceIds,
        date: ymd,
      });
      if (slots.some((s) => new Date(s).getTime() === startMs)) {
        matched = sid;
        break;
      }
    }
    if (!matched) {
      return NextResponse.json(
        { error: "That time was just taken. Pick another slot." },
        { status: 409 }
      );
    }
    stylistId = matched;
  }

  const stylist = await prisma.stylist.findFirst({
    where: { id: stylistId, salonId: salon.id, active: true },
  });
  if (!stylist) {
    return NextResponse.json({ error: "Invalid stylist" }, { status: 400 });
  }

  for (const service of ordered) {
    const link = await prisma.stylistService.findUnique({
      where: {
        stylistId_serviceId: { stylistId: stylist.id, serviceId: service.id },
      },
    });
    if (!link) {
      return NextResponse.json(
        { error: "Stylist does not offer all selected services" },
        { status: 400 }
      );
    }
  }

  const visitEnd = addMinutes(startsAt, totalDuration);
  const conflict = await prisma.appointment.findFirst({
    where: {
      stylistId: stylist.id,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { lt: visitEnd },
      endsAt: { gt: startsAt },
    },
  });
  if (conflict) {
    return NextResponse.json(
      { error: "That time was just taken. Pick another slot." },
      { status: 409 }
    );
  }

  const session = await getClientSessionForSalon(salon.id);
  const emailNorm = data.clientEmail ? normalizeEmail(data.clientEmail) : "";

  let client = session
    ? await prisma.client.findUnique({ where: { id: session.clientId } })
    : null;

  if (!client) {
    client = await prisma.client.findFirst({
      where: {
        salonId: salon.id,
        OR: [
          { phone: data.clientPhone },
          ...(emailNorm ? [{ email: emailNorm }] : []),
        ],
      },
    });
  }

  if (!client) {
    client = await prisma.client.create({
      data: {
        salonId: salon.id,
        name: data.clientName,
        phone: data.clientPhone,
        email: emailNorm || null,
      },
    });
  } else {
    client = await prisma.client.update({
      where: { id: client.id },
      data: {
        name: data.clientName,
        phone: data.clientPhone,
        email: emailNorm || client.email,
        preferredStylistId:
          data.stylistId === ANY_STYLIST_ID
            ? client.preferredStylistId
            : stylist.id,
      },
    });
  }

  const bookingGroupId = ordered.length > 1 ? crypto.randomUUID() : null;
  let cursor = startsAt;
  const created = [];
  for (const service of ordered) {
    const endsAt = addMinutes(cursor, service.durationMin);
    const appointment = await prisma.appointment.create({
      data: {
        salonId: salon.id,
        stylistId: stylist.id,
        serviceId: service.id,
        clientId: client.id,
        startsAt: cursor,
        endsAt,
        status: "BOOKED",
        source: "ONLINE",
        bookingGroupId,
        notes: data.notes || null,
      },
      include: { service: true, stylist: true, client: true },
    });
    created.push(appointment);
    cursor = endsAt;
  }

  const head = created[0]!;

  let stylePrefId: string | null = null;
  if (data.stylePref?.imageBase64) {
    const decoded = decodeStylePhoto(data.stylePref.imageBase64, data.stylePref.mimeType);
    if (decoded.ok) {
      const pref = await prisma.appointmentStylePref.create({
        data: {
          salonId: salon.id,
          appointmentId: head.id,
          clientId: client.id,
          photoData: decoded.photo.bytes,
          photoMime: decoded.photo.mime,
          source: data.stylePref.source || "UPLOAD",
          prompt: normalizeStylePrompt(data.stylePref.prompt),
        },
        select: { id: true },
      });
      stylePrefId = pref.id;
    }
  }

  await Promise.all(created.map((a) => syncAppointmentToGoogle(a.id).catch(() => null)));

  return NextResponse.json({
    appointment: {
      id: head.id,
      bookingGroupId,
      startsAt: head.startsAt,
      endsAt: created[created.length - 1]!.endsAt,
      status: head.status,
      service: ordered.map((s) => s.name).join(" + "),
      services: ordered.map((s) => ({
        id: s.id,
        name: s.name,
        durationMin: s.durationMin,
        priceCents: s.priceCents,
      })),
      stylist: head.stylist.name,
      client: head.client.name,
      priceCents: totalPrice,
      durationMin: totalDuration,
      stylePrefId,
    },
    calendarSync: null,
    suggestJoin: Boolean(emailNorm) && !client.memberAt && !session,
    saveAsMember: Boolean(data.saveAsMember),
  });
}
