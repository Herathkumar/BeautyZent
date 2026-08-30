import { BEAUTYZENT, BEAUTYZENT_LOGO } from "@/components/BeautyZentBrand";

type Props = {
  className?: string;
  compact?: boolean;
  /** Optional lead line above the brand (e.g. salon name on displays). */
  lead?: string;
  /**
   * @deprecated Always BeautyZent Marketplace. Kept for call-site compatibility.
   */
  brand?: "zentralab" | "beautyzent";
  /** Show website (left) and email (right). */
  showContacts?: boolean;
  /**
   * @deprecated Contacts are always web left / email right around a centered brand.
   */
  contactsPlacement?: "end" | "below";
  /**
   * stack: brand above, contacts below (apps / login).
   * row: web | brand | email on one line (customer displays).
   */
  layout?: "stack" | "row";
};

function BrandMark({
  lead,
  size = "footer",
}: {
  lead?: string;
  size?: "footer" | "inline";
}) {
  const logoClass =
    size === "inline"
      ? "h-8 w-auto shrink-0 object-contain object-left"
      : "h-8 w-auto shrink-0 object-contain object-left sm:h-9";
  const titleClass = "font-display whitespace-nowrap text-sm tracking-tight";

  return (
    <div className="flex items-center justify-center gap-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={BEAUTYZENT_LOGO}
        alt={BEAUTYZENT.name}
        width={40}
        height={40}
        className={logoClass}
      />
      <div className="text-left leading-tight">
        {lead ? (
          <p className="text-sm font-medium text-[color:var(--ink)]">{lead}</p>
        ) : (
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne">
            Powered by
          </p>
        )}
        <p className={titleClass}>
          <span className="beautyzent-name text-[color:var(--champagne,#c9a227)]">
            BeautyZent
          </span>{" "}
          <span className="beautyzent-marketplace text-[color:var(--mint,#7dd3c0)]">
            Marketplace
          </span>
        </p>
        {size === "footer" ? (
          <p className="zentralab-footer-meta mt-0.5 text-xs text-muted">
            © {new Date().getFullYear()} BeautyZent. All rights reserved.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ContactRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex w-full items-center justify-between gap-3 ${className}`.trim()}
    >
      <a
        href="https://www.beautyzent.com"
        target="_blank"
        rel="noreferrer"
        className="beautyzent-footer-web shrink-0 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne transition hover:opacity-80"
      >
        www.beautyzent.com
      </a>
      <a
        href="mailto:hello@beautyzent.com"
        className="beautyzent-footer-email shrink-0 text-right text-[11px] font-semibold tracking-[0.2em] normal-case text-[color:var(--mint,#7dd3c0)] transition hover:opacity-80"
      >
        hello@beautyzent.com
      </a>
    </div>
  );
}

/** Compact rose-gold lockup. Reception: left brand only. Apps: brand center, web left / email right at bottom. */
export function BeautyZentPoweredBy({
  className = "",
  showContacts = true,
  align = "center",
}: {
  className?: string;
  showContacts?: boolean;
  align?: "center" | "left";
}) {
  return (
    <div
      className={`flex w-full flex-col items-stretch gap-2 ${className}`.trim()}
      data-testid="beautyzent-powered-by"
    >
      <div
        className={`flex w-full ${align === "left" ? "justify-start" : "justify-center"}`}
      >
        <BrandMark size="inline" />
      </div>
      {showContacts ? <ContactRow /> : null}
    </div>
  );
}

export function ZentraLabFooter({
  className = "",
  compact = false,
  lead,
  showContacts = true,
  layout = "stack",
}: Props) {
  const contacts = showContacts && !lead;

  return (
    <footer
      className={`zentralab-footer border-t border-[color:var(--line)] ${
        compact ? "mt-6 px-4 py-4" : "mt-10 px-6 py-6"
      } ${className}`}
      data-testid="zentralab-footer"
      data-brand="beautyzent"
      data-layout={layout}
    >
      {layout === "row" && contacts ? (
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-3">
          <a
            href="https://www.beautyzent.com"
            target="_blank"
            rel="noreferrer"
            className="beautyzent-footer-web justify-self-start text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-champagne transition hover:opacity-80"
          >
            www.beautyzent.com
          </a>
          <BrandMark lead={lead} size="footer" />
          <a
            href="mailto:hello@beautyzent.com"
            className="beautyzent-footer-email justify-self-end text-right text-[11px] font-semibold tracking-[0.2em] normal-case text-[color:var(--mint,#7dd3c0)] transition hover:opacity-80"
          >
            hello@beautyzent.com
          </a>
        </div>
      ) : (
        <div className="flex w-full flex-col items-stretch gap-2.5">
          <div className="flex w-full justify-center">
            <BrandMark lead={lead} size="footer" />
          </div>
          {contacts ? <ContactRow /> : null}
        </div>
      )}
    </footer>
  );
}
