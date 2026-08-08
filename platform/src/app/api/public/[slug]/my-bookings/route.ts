import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CLIENT_CANCEL_HOURS,
  canCancelOnline,
  getClientSessionForSalon,
} from "@/lib/client-auth";
import { MAX_PHOTOS_PER_APPOINTMENT, lookPhotoUrl } from "@/lib/look-photos";
import { stylePrefPublicUrl } from "@/lib/style-prefs";
import { stylistPhotoUrl } from "@/lib/stylist-photo";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const session = await getClientSessionForSalon(salon.id);
  if (!session) {
    return NextResponse.json({ error: "Sign in to see your bookings." }, { status: 401 });
  }

  const now = new Date();
  const rows = await prisma.appointment.findMany({
    where: { salonId: salon.id, clientId: session.clientId },
    orderBy: { startsAt: "asc" },
    take: 80,
    include: {
      service: { select: { name: true, durationMin: true, priceCents: true } },
      stylist: {
        select: {
          id: true,
          name: true,
          gender: true,
          photoUpdatedAt: true,
          photoMime: true,
        },
      },
      lookPhotos: {
        orderBy: { createdAt: "asc" },
        select: { id: true, caption: true, createdAt: true },
      },
      stylePref: {
        select: { id: true, source: true, prompt: true },
      },
    },
  });

  type Row = (typeof rows)[number];
  const groups = new Map<string, Row[]>();
  for (const a of rows) {
    const key = a.bookingGroupId || a.id;
    const list = groups.get(key) || [];
    list.push(a);
    groups.set(key, list);
  }

  const appointments = [...groups.values()]
    .map((group) => {
      group.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      const head = group[0]!;
      const tail = group[group.length - 1]!;
      const photos = group.flatMap((a) => a.lookPhotos);
      const durationMin = group.reduce((sum, a) => sum + a.service.durationMin, 0);
      const priceCents = group.reduce((sum, a) => sum + a.service.priceCents, 0);
      const stylePref = group.find((a) => a.stylePref)?.stylePref || null;
      const status = group.some((a) => a.status === "BOOKED")
        ? "BOOKED"
        : group.some((a) => a.status === "CHECKED_IN")
          ? "CHECKED_IN"
          : head.status;

      return {
        id: head.id,
        bookingGroupId: head.bookingGroupId,
        startsAt: head.startsAt,
        endsAt: tail.endsAt,
        status,
        notes: head.notes,
        service: {
          name: group.map((a) => a.service.name).join(" + "),
          durationMin,
          priceCents,
        },
        stylist: {
          id: head.stylist.id,
          name: head.stylist.name,
          photoUrl: stylistPhotoUrl({
            id: head.stylist.id,
            gender: head.stylist.gender,
            photoUpdatedAt: head.stylist.photoUpdatedAt,
            hasPhoto: Boolean(head.stylist.photoMime && head.stylist.photoUpdatedAt),
          }),
        },
        canCancel:
          ["BOOKED", "CHECKED_IN"].includes(status) &&
          canCancelOnline(head.startsAt, now),
        canAddPhotos:
          head.startsAt.getTime() <= now.getTime() &&
          !["CANCELLED", "NO_SHOW"].includes(status),
        photos: photos.map((p) => ({
          id: p.id,
          caption: p.caption,
          createdAt: p.createdAt,
          url: lookPhotoUrl(slug, p.id),
        })),
        stylePref: stylePref
          ? {
              id: stylePref.id,
              source: stylePref.source,
              prompt: stylePref.prompt,
              url: stylePrefPublicUrl(slug, stylePref.id),
            }
          : null,
      };
    })
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .slice(0, 40);

  return NextResponse.json({
    appointments,
    cancelPolicyHours: CLIENT_CANCEL_HOURS,
    maxPhotosPerVisit: MAX_PHOTOS_PER_APPOINTMENT,
    timezone: salon.timezone,
  });
}
