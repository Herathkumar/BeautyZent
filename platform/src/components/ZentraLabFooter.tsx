type Props = {
  /** Extra classes on the footer element */
  className?: string;
  /** Compact spacing for login / booking pages */
  compact?: boolean;
};

export function ZentraLabFooter({ className = "", compact = false }: Props) {
  return (
    <footer
      className={`zentralab-footer border-t border-[color:var(--line)] ${
        compact ? "mt-10 px-0 py-5" : "mt-auto px-6 py-6"
      } ${className}`}
      data-testid="zentralab-footer"
    >
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-champagne uppercase opacity-80">
            Powered by
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-wide">
            <span className="text-[#5BA3E0]">Zentra</span>
            <span className="text-[#2DD4BF]">Lab</span>
          </p>
          <p className="zentralab-footer-meta mt-0.5 text-xs text-muted">
            © {new Date().getFullYear()} ZentraLab. All rights reserved.
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 text-sm sm:items-end">
          <a
            href="https://www.zentralab.ca"
            target="_blank"
            rel="noreferrer"
            className="text-champagne transition hover:opacity-80"
          >
            www.zentralab.ca
          </a>
          <a
            href="mailto:hello@zentralab.ca"
            className="zentralab-footer-meta text-muted transition hover:text-champagne"
          >
            hello@zentralab.ca
          </a>
        </div>
      </div>
    </footer>
  );
}
