import { BEAUTYZENT } from "@/components/BeautyZentBrand";

type Brand = "zentralab" | "beautyzent";

type Props = {
  className?: string;
  compact?: boolean;
  /** Optional lead line above the brand (e.g. salon name on displays). */
  lead?: string;
  /** Display brand. Customer lounge/schedule use BeautyZent Marketplace. */
  brand?: Brand;
};

export function ZentraLabFooter({
  className = "",
  compact = false,
  lead,
  brand = "zentralab",
}: Props) {
  const isBeautyZent = brand === "beautyzent";

  return (
    <footer
      className={`zentralab-footer border-t border-[color:var(--line)] ${
        compact ? "mt-6 px-4 py-4" : "mt-10 px-6 py-6"
      } ${className}`}
      data-testid="zentralab-footer"
      data-brand={brand}
    >
      <div
        className={`flex gap-3 ${
          isBeautyZent
            ? "w-full flex-row items-center justify-between text-left"
            : "mx-auto max-w-5xl flex-col items-center text-center sm:flex-row sm:justify-between sm:text-left"
        }`}
      >
        <div className={isBeautyZent ? "flex min-w-0 items-center gap-2.5" : undefined}>
          {isBeautyZent ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/brand/beautyzent-logo-gold-mark.png"
              alt={BEAUTYZENT.name}
              width={40}
              height={40}
              className="h-8 w-8 shrink-0 object-contain sm:h-9 sm:w-9"
            />
          ) : null}
          <div>
            {lead ? (
              <p className="text-sm font-medium text-[color:var(--ink)]">{lead}</p>
            ) : (
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
                Powered by
              </p>
            )}
            {isBeautyZent ? (
              <p className="font-display text-xl tracking-tight">
                <span className="text-[color:var(--champagne,#c9a227)]">BeautyZent</span>{" "}
                <span className="text-[color:var(--mint,#7dd3c0)]">Marketplace</span>
              </p>
            ) : (
              <p className="font-display text-xl tracking-tight">
                <span className="text-[color:var(--sky)]">Zentra</span>
                <span className="text-[color:var(--mint)]">Lab</span>
              </p>
            )}
            <p className="zentralab-footer-meta mt-0.5 text-xs text-muted">
              © {new Date().getFullYear()}{" "}
              {isBeautyZent ? "BeautyZent" : "ZentraLab"}. All rights reserved.
            </p>
          </div>
        </div>
        {isBeautyZent ? (
          <div className="beautyzent-footer-contacts flex shrink-0 flex-col items-end gap-0.5 text-right">
            <a
              href="https://www.beautyzent.com"
              target="_blank"
              rel="noreferrer"
              className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne transition hover:opacity-80"
            >
              www.beautyzent.com
            </a>
            <a
              href="mailto:hello@beautyzent.com"
              className="text-[11px] font-semibold tracking-[0.2em] normal-case text-[color:var(--mint,#7dd3c0)] transition hover:opacity-80"
            >
              hello@beautyzent.com
            </a>
          </div>
        ) : !lead ? (
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs">
            <a
              href="https://zentralab.ca"
              target="_blank"
              rel="noreferrer"
              className="zentralab-footer-meta text-muted transition hover:text-champagne"
            >
              zentralab.ca
            </a>
            <a
              href="mailto:hello@zentralab.ca"
              className="text-muted transition hover:text-champagne"
            >
              hello@zentralab.ca
            </a>
          </div>
        ) : null}
      </div>
    </footer>
  );
}
