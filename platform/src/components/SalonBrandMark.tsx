import { splitBrandName } from "@/lib/salon-branding";

/** Server-safe brand split — keep this out of client state so hydration cannot disagree. */
export function SalonBrandMark({ name, className }: { name: string; className?: string }) {
  const { lead, rest } = splitBrandName(name);
  return (
    <span className={className}>
      {lead}
      {rest ? (
        <>
          {" "}
          <span className="text-champagne">{rest}</span>
        </>
      ) : null}
    </span>
  );
}
