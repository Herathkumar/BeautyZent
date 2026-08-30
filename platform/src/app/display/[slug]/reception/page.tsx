import { notFound } from "next/navigation";
import { canAccessReception, getSession } from "@/lib/auth";
import { managerHasPhoto, managerPhotoUrl } from "@/lib/manager-photo";
import { prisma } from "@/lib/prisma";
import { salonLoginContext } from "@/lib/salon-login";
import { stylistHasPhoto, stylistPhotoUrl } from "@/lib/stylist-photo";
import { ReceptionLogin } from "@/components/display/ReceptionLogin";
import { DisplayBoard } from "../DisplayBoard";

export default async function ReceptionDisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, active: true },
  });
  if (!salon?.active) notFound();

  const session = await getSession();
  const allowed =
    session && session.salonId === salon.id && canAccessReception(session.role);

  if (!session || !allowed) {
    const ctx = await salonLoginContext(slug);
    const accounts = (ctx?.users || [])
      .filter((user) => canAccessReception(user.role))
      .map((user) => ({ email: user.email, name: user.name, role: user.role }));
    const blockedReason = session && session.salonId !== salon.id ? "other-salon" : null;
    return (
      <ReceptionLogin
        slug={salon.slug}
        salonId={salon.id}
        salonName={salon.name}
        accounts={accounts}
        blockedReason={blockedReason}
      />
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      photoMime: true,
      photoUpdatedAt: true,
      stylist: {
        select: {
          id: true,
          gender: true,
          photoMime: true,
          photoUpdatedAt: true,
        },
      },
    },
  });

  let staffPhotoUrl: string | null = null;
  if (user && managerHasPhoto(user)) {
    staffPhotoUrl = managerPhotoUrl(user);
  } else if (
    user?.stylist &&
    stylistHasPhoto({
      id: user.stylist.id,
      gender: user.stylist.gender,
      photoUpdatedAt: user.stylist.photoUpdatedAt,
      hasPhoto: Boolean(user.stylist.photoMime && user.stylist.photoUpdatedAt),
    })
  ) {
    staffPhotoUrl = stylistPhotoUrl({
      id: user.stylist.id,
      gender: user.stylist.gender,
      photoUpdatedAt: user.stylist.photoUpdatedAt,
      hasPhoto: true,
    });
  }

  return (
    <DisplayBoard
      slug={slug}
      variant="reception"
      staffName={session.name}
      staffRole={session.role}
      staffPhotoUrl={staffPhotoUrl}
    />
  );
}
