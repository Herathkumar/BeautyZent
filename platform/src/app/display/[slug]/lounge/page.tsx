import { DisplayBoard } from "../DisplayBoard";
import { DisplayUnavailable } from "../DisplayUnavailable";
import { prisma } from "@/lib/prisma";

export default async function LoungeDisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true, active: true, loungeDisplayEnabled: true },
  });
  if (!salon?.active || salon.loungeDisplayEnabled === false) {
    return (
      <DisplayUnavailable
        title="Lounge display is off"
        detail="An operator can enable the Lounge TV for this salon in the BeautyZent console."
      />
    );
  }
  return <DisplayBoard slug={slug} variant="customer" fixedView="lounge" />;
}
