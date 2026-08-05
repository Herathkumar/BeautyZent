type Props = {
  /** Extra classes on the footer element */
  className?: string;
  /** Compact spacing for login / booking pages */
  compact?: boolean;
};

export function ZentraLabFooter({ className = "", compact = false }: Props) {
  return (
    <footer
      className={`border-t border-white/10 ${compact ? "mt-10 px-0 py-5" : "mt-auto px-6 py-6"} ${className}`}
      data-testid="zentralab-footer"
    >
      <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#c9a87c]/80 uppercase">
            Powered by
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl tracking-wide">
            <span className="text-[#5BA3E0]">Zentra</span>
            <span className="text-[#2DD4BF]">Lab</span>
          </p>
          <p className="mt-0.5 text-xs text-white/45">
            © {new Date().getFullYear()} ZentraLab. All rights reserved.
          </p>
        </div>
        <div className="flex flex-col items-center gap-1 text-sm sm:items-end">
          <a
            href="https://www.zentralab.ca"
            target="_blank"
            rel="noreferrer"
            className="text-[#f0c987] transition hover:text-[#fffaf6]"
          >
            www.zentralab.ca
          </a>
          <a
            href="mailto:hello@zentralab.ca"
            className="text-white/55 transition hover:text-[#f0c987]"
          >
            hello@zentralab.ca
          </a>
        </div>
      </div>
    </footer>
  );
}
