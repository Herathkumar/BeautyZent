/** Salon lookbook styles for Lounge TV + booking (numbered client picks). */

export function salonLookImageUrl(opts: {
  id: string;
  side: "before" | "after";
  hasImage?: boolean;
  updatedAt?: Date | string | null;
}) {
  if (!opts.hasImage) return null;
  const v =
    opts.updatedAt instanceof Date
      ? opts.updatedAt.getTime()
      : opts.updatedAt
        ? new Date(opts.updatedAt).getTime()
        : Date.now();
  return `/api/public/salon-look-image/${opts.id}?side=${opts.side}&v=${v}`;
}
