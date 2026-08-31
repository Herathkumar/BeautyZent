import { DisplayBoard } from "../DisplayBoard";
import { DisplayUnavailable } from "../DisplayUnavailable";
import { prisma } from "@/lib/prisma";

export default async function SchedulerDisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: { name: true, active: true, schedulerDisplayEnabled: true },
  });
  if (!salon?.active || salon.schedulerDisplayEnabled === false) {
    return (
      <DisplayUnavailable
        title="Scheduler display is off"
        detail="An operator can enable the Scheduler TV for this salon in the BeautyZent console."
      />
    );
  }
  return <DisplayBoard slug={slug} variant="customer" fixedView="timeline" />;
}
