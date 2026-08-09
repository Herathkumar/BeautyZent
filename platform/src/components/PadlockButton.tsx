"use client";

type Props = {
  locked: boolean;
  onClick: () => void;
  disabled?: boolean;
  /** Accessible name */
  label?: string;
  className?: string;
  "data-testid"?: string;
};

function PadlockIcon({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none">
        <path
          d="M7 11V8a5 5 0 0 1 10 0v3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect
          x="5"
          y="11"
          width="14"
          height="10"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="15.5" r="1.25" fill="currentColor" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden className="h-5 w-5" fill="none">
      <path
        d="M7 11V8a5 5 0 0 1 9.6-1.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="11"
        width="14"
        height="10"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="15.5" r="1.25" fill="currentColor" />
    </svg>
  );
}

/** Padlock control — locked = click to unlock; unlocked = click to lock. */
export function PadlockButton({
  locked,
  onClick,
  disabled,
  label,
  className = "",
  "data-testid": testId = "display-padlock",
}: Props) {
  const aria = label || (locked ? "Unlock board" : "Lock board");
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={aria}
      title={aria}
      data-testid={testId}
      data-locked={locked ? "true" : "false"}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-white/5 text-[#f0c987] transition hover:border-[#c9a87c]/55 hover:bg-[#c9a87c]/15 hover:text-[#f0c987] disabled:opacity-40 ${className}`}
    >
      <PadlockIcon locked={locked} />
    </button>
  );
}
