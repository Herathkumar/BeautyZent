"use client";

type ToggleVariant = "admin" | "reception";

type ToggleSwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
  testId?: string;
  disabled?: boolean;
  variant?: ToggleVariant;
};

export function ToggleSwitch({
  checked,
  onChange,
  ariaLabel,
  testId,
  disabled,
  variant = "admin",
}: ToggleSwitchProps) {
  const trackClass =
    variant === "reception"
      ? "bg-white/15 peer-checked:bg-[var(--rx-cta-walkin,#c9a87c)] peer-focus-visible:ring-white/25"
      : "bg-[#7d6154]/22 peer-checked:bg-[#7d6154] peer-focus-visible:ring-[#7d6154]/35";

  return (
    <span className="relative inline-block h-7 w-12 shrink-0">
      <input
        type="checkbox"
        role="switch"
        className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
        aria-label={ariaLabel}
      />
      <span
        className={`pointer-events-none absolute inset-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-disabled:opacity-60 ${trackClass}`}
        aria-hidden
      />
      <span
        className="pointer-events-none absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(43,37,33,0.22)] transition-transform peer-checked:translate-x-5"
        aria-hidden
      />
    </span>
  );
}
