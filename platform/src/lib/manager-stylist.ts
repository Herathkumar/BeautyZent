import { prisma } from "@/lib/prisma";
import { linkStylistToAllServices } from "@/lib/service-links";
import { refreshSessionForUserId } from "@/lib/auth";

/** Enable or disable the manager's linked self-managed stylist profile. */
export async function setManagerAlsoStylist(opts: {
  userId: string;
  salonId: string;
  enabled: boolean;
}) {
  const user = await prisma.user.findUnique({
    where: { id: opts.userId },
    include: {
      stylist: {
        select: {
          id: true,
          active: true,
          selfManageSchedule: true,
        },
      },
    },
  });
  if (!user || user.salonId !== opts.salonId) {
    return { error: "User not found" as const };
  }

  if (!opts.enabled) {
    if (user.stylistId) {
      await prisma.stylist.update({
        where: { id: user.stylistId },
        data: { active: false },
      });
    }
    await refreshSessionForUserId(user.id);
    return { alsoStylist: false as const, stylistId: user.stylistId };
  }

  const salon = await prisma.salon.findUnique({ where: { id: opts.salonId } });
  if (!salon) return { error: "Salon not found" as const };

  let stylistId = user.stylistId;

  if (stylistId && user.stylist) {
    await prisma.stylist.update({
      where: { id: stylistId },
      data: {
        active: true,
        selfManageSchedule: true,
        name: user.name,
        bio: user.bio,
        ...(user.photoData && user.photoMime
          ? {
              photoData: user.photoData,
              photoMime: user.photoMime,
              photoUpdatedAt: user.photoUpdatedAt || new Date(),
            }
          : {}),
      },
    });
  } else {
    const stylist = await prisma.stylist.create({
      data: {
        salonId: opts.salonId,
        name: user.name,
        bio: user.bio,
        color: "#6e4a38",
        gender: "UNSPECIFIED",
        active: true,
        selfManageSchedule: true,
        payType: "COMMISSION",
        commissionBps: 5000,
        ...(user.photoData && user.photoMime
          ? {
              photoData: user.photoData,
              photoMime: user.photoMime,
              photoUpdatedAt: user.photoUpdatedAt || new Date(),
            }
          : {}),
      },
    });
    stylistId = stylist.id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stylistId },
    });
    await linkStylistToAllServices(opts.salonId, stylist.id);

    const closedDays = new Set(
      Array.isArray(salon.closedDays) && salon.closedDays.length > 0
        ? salon.closedDays
        : [0]
    );
    for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
      await prisma.stylistWeekHour.create({
        data: {
          stylistId: stylist.id,
          dayOfWeek,
          startHour: salon.openHour,
          endHour: salon.closeHour,
          isOff: closedDays.has(dayOfWeek),
        },
      });
    }
  }

  await refreshSessionForUserId(user.id);
  return { alsoStylist: true as const, stylistId };
}
