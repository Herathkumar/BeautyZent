import { redirect } from "next/navigation";
import { DisplayUnavailable } from "./DisplayUnavailable";
import { pickEnabledDisplayRedirect } from "@/lib/store-displays";
import { prisma } from "@/lib/prisma";

export default async function DisplayPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({
    where: { slug },
    select: {
      active: true,
      loungeDisplayEnabled: true,
      schedulerDisplayEnabled: true,
    },
  });
  if (!salon?.active) {
    return (
      <DisplayUnavailable
        title="Display unavailable"
        detail="This salon is not active."
      />
    );
  }
  const surface = pickEnabledDisplayRedirect(salon);
  if (!surface) {
    return (
      <DisplayUnavailable
        title="No store display enabled"
        detail="Enable Lounge and/or Scheduler for this salon in the BeautyZent operator console."
      />
    );
  }
  redirect(`/display/${slug}/${surface}`);
}
