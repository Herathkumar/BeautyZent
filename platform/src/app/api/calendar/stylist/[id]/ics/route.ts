import { NextResponse } from "next/server";
import { addDays } from "date-fns";
import { prisma } from "@/lib/prisma";

function escapeIcs(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function fmt(d: Date) {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

/** Subscribe URL for Apple/Google Calendar apps (read-only feed) */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stylist = await prisma.stylist.findUnique({
    where: { id },
    include: { salon: true },
  });
  if (!stylist) return new NextResponse("Not found", { status: 404 });

  const from = new Date();
  const to = addDays(from, 60);
  const appointments = await prisma.appointment.findMany({
    where: {
      stylistId: id,
      status: { notIn: ["CANCELLED", "NO_SHOW"] },
      startsAt: { gte: from, lte: to },
    },
    include: { client: true, service: true },
    orderBy: { startsAt: "asc" },
  });

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SalonBook//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcs(`${stylist.name} @ ${stylist.salon.name}`)}`,
  ];

  for (const a of appointments) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${a.id}@salonbook`,
      `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(a.startsAt)}`,
      `DTEND:${fmt(a.endsAt)}`,
      `SUMMARY:${escapeIcs(`${a.service.name} — ${a.client.name}`)}`,
      `DESCRIPTION:${escapeIcs(
        `Client: ${a.client.name}\nPhone: ${a.client.phone || ""}\n${a.notes || ""}`
      )}`,
      `LOCATION:${escapeIcs(stylist.salon.address || stylist.salon.name)}`,
      "END:VEVENT"
    );
  }
  lines.push("END:VCALENDAR");

  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${stylist.name}-bookings.ics"`,
    },
  });
}
