import { google } from "googleapis";
import { prisma } from "./prisma";

function oauthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function getGoogleOAuthClient() {
  if (!oauthConfigured()) return null;
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export function getGoogleAuthUrl(stylistId: string) {
  const client = getGoogleOAuthClient();
  if (!client) return null;
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar.events"],
    state: stylistId,
  });
}

export async function exchangeGoogleCode(code: string) {
  const client = getGoogleOAuthClient();
  if (!client) throw new Error("Google OAuth is not configured");
  const { tokens } = await client.getToken(code);
  return tokens;
}

async function calendarForStylist(stylistId: string) {
  const stylist = await prisma.stylist.findUnique({
    where: { id: stylistId },
    select: {
      id: true,
      googleRefreshToken: true,
      googleCalendarId: true,
    },
  });
  if (!stylist?.googleRefreshToken) return null;
  const client = getGoogleOAuthClient();
  if (!client) return null;
  client.setCredentials({ refresh_token: stylist.googleRefreshToken });
  return {
    calendar: google.calendar({ version: "v3", auth: client }),
    calendarId: stylist.googleCalendarId || "primary",
    stylist,
  };
}

export async function syncAppointmentToGoogle(appointmentId: string) {
  // Never pull image/photo Bytes — they stall the Node event loop and freeze seating.
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      id: true,
      status: true,
      startsAt: true,
      endsAt: true,
      notes: true,
      googleEventId: true,
      stylistId: true,
      client: { select: { name: true, phone: true } },
      service: { select: { name: true } },
      salon: { select: { name: true } },
    },
  });
  if (!appt) return { ok: false, reason: "not_found" as const };
  if (appt.status === "CANCELLED") {
    return deleteGoogleEvent(appointmentId);
  }

  const bound = await calendarForStylist(appt.stylistId);
  if (!bound) {
    return { ok: false, reason: "not_connected" as const };
  }

  const summary = `${appt.service.name} — ${appt.client.name}`;
  const description = [
    `Salon: ${appt.salon.name}`,
    `Client: ${appt.client.name}`,
    appt.client.phone ? `Phone: ${appt.client.phone}` : null,
    `Service: ${appt.service.name}`,
    appt.notes ? `Notes: ${appt.notes}` : null,
    "Synced from SalonBook",
  ]
    .filter(Boolean)
    .join("\n");

  const body = {
    summary,
    description,
    start: { dateTime: appt.startsAt.toISOString() },
    end: { dateTime: appt.endsAt.toISOString() },
    reminders: { useDefault: true },
  };

  try {
    if (appt.googleEventId) {
      await bound.calendar.events.update({
        calendarId: bound.calendarId,
        eventId: appt.googleEventId,
        requestBody: body,
      });
      await prisma.appointment.update({
        where: { id: appt.id },
        data: { calendarSyncedAt: new Date() },
      });
      return { ok: true, eventId: appt.googleEventId };
    }

    const created = await bound.calendar.events.insert({
      calendarId: bound.calendarId,
      requestBody: body,
    });
    const eventId = created.data.id || null;
    await prisma.appointment.update({
      where: { id: appt.id },
      data: { googleEventId: eventId, calendarSyncedAt: new Date() },
    });
    return { ok: true, eventId };
  } catch (err) {
    console.error("Google Calendar sync failed", err);
    return { ok: false, reason: "sync_error" as const };
  }
}

export async function deleteGoogleEvent(appointmentId: string) {
  const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } });
  if (!appt?.googleEventId) return { ok: true };
  const bound = await calendarForStylist(appt.stylistId);
  if (!bound) return { ok: false, reason: "not_connected" as const };
  try {
    await bound.calendar.events.delete({
      calendarId: bound.calendarId,
      eventId: appt.googleEventId,
    });
  } catch {
    // Event may already be deleted on phone
  }
  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { googleEventId: null, calendarSyncedAt: new Date() },
  });
  return { ok: true };
}

/** ICS fallback so stylists can subscribe without Google OAuth during pilot */
export function buildIcs(opts: {
  uid: string;
  title: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  location?: string;
}) {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SalonBook//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@salonbook`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(opts.startsAt)}`,
    `DTEND:${fmt(opts.endsAt)}`,
    `SUMMARY:${escapeIcs(opts.title)}`,
    `DESCRIPTION:${escapeIcs(opts.description)}`,
    opts.location ? `LOCATION:${escapeIcs(opts.location)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function isGoogleConfigured() {
  return oauthConfigured();
}
