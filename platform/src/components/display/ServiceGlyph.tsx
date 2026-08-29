export function ServiceGlyph({
  kind,
  className = "h-3.5 w-3.5",
}: {
  kind: "cut" | "color" | "style" | "nail" | "facial" | "other";
  className?: string;
}) {
  const common = className;
  if (kind === "nail") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 16V8a5 5 0 0 1 10 0v8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M7 13h10" stroke="currentColor" strokeWidth="1.6" />
        <path d="M12 4v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "facial") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="currentColor" />
        <path d="M18 10a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" fill="currentColor" />
        <path d="M10 15s1 2 2 2 2-2 2-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "color") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3c2 3.5 6 7 6 11a6 6 0 1 1-12 0c0-4 4-7.5 6-11Z"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  if (kind === "style") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 7h16M6 12h12M8 17h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="6.5" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17.5" cy="7" r="2.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.4 8.6 12 14l3.6-5.4M12 14v6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}