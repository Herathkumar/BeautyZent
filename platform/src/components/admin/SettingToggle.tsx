"use client";

type SettingToggleProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId?: string;
  disabled?: boolean;
  /** Hide label text visually but keep it for screen readers (rule rows). */
  hideLabel?: boolean;
};

export function SettingToggle({
  label,
  checked,
  onChange,
  testId,
  disabled,
  hideLabel,
}: SettingToggleProps) {
  return (
    <label
      className={`flex items-center gap-3 ${hideLabel ? "justify-end" : "justify-between"} ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <span className={`text-sm text-[#2b2521] ${hideLabel ? "sr-only" : ""}`}>{label}</span>
      <span className="relative inline-block h-7 w-12 shrink-0">
        <input
          type="checkbox"
          role="switch"
          className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer opacity-0"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          data-testid={testId}
          aria-label={label}
        />
        <span
          className="pointer-events-none absolute inset-0 rounded-full bg-[#7d6154]/22 transition-colors peer-checked:bg-[#7d6154] peer-focus-visible:ring-2 peer-focus-visible:ring-[#7d6154]/35 peer-disabled:opacity-60"
          aria-hidden
        />
        <span
          className="pointer-events-none absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-[0_1px_3px_rgba(43,37,33,0.22)] transition-transform peer-checked:translate-x-5"
          aria-hidden
        />
      </span>
    </label>
  );
}
