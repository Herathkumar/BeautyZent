"use client";

import { useEffect, useState } from "react";

export type SalonMembershipOption = {
  clientId: string;
  salonId: string;
  salonName: string;
  salonSlug: string;
  memberName: string;
};

type Props = {
  /** Current booking URL slug — marks that row as active when IDs match. */
  currentSlug: string;
  /** When true, load memberships from /api/public/auth/my-salons. */
  enabled: boolean;
  /** Optional seed from verify-otp so the list appears before a refetch. */
  initialSalons?: SalonMembershipOption[] | null;
  initialCurrentSalonId?: string | null;
  /** Drop the outer card chrome when nested inside another panel. */
  embedded?: boolean;
  className?: string;
};

export function BookingSalonChooser({
  currentSlug,
  enabled,
  initialSalons = null,
  initialCurrentSalonId = null,
  embedded = false,
  className = "",
}: Props) {
  const [salons, setSalons] = useState<SalonMembershipOption[]>(initialSalons || []);
  const [currentSalonId, setCurrentSalonId] = useState<string | null>(
    initialCurrentSalonId
  );
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialSalons?.length) {
      setSalons(initialSalons);
      if (initialCurrentSalonId) setCurrentSalonId(initialCurrentSalonId);
    }
  }, [initialSalons, initialCurrentSalonId]);

  useEffect(() => {
    if (!enabled) {
      setSalons([]);
      setCurrentSalonId(null);
      return;
    }
    let cancelled = false;
    fetch("/api/public/auth/my-salons")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setSalons(Array.isArray(d.salons) ? d.salons : []);
        setCurrentSalonId(d.currentSalonId || null);
      })
      .catch(() => {
        if (!cancelled) setSalons([]);
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  async function switchTo(nextSlug: string) {
    if (nextSlug === currentSlug || busySlug) return;
    setBusySlug(nextSlug);
    setError("");
    try {
      const res = await fetch("/api/public/auth/switch-salon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: nextSlug }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not switch business");
      window.location.assign(`/book/${encodeURIComponent(nextSlug)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch business");
      setBusySlug(null);
    }
  }

  if (!enabled || salons.length < 2) return null;

  return (
    <section
      className={`${
        embedded ? "" : "book-card rounded-3xl px-5 py-5"
      } ${className}`.trim()}
      data-testid="client-salon-chooser"
    >
      {!embedded ? (
        <>
          <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
            Your businesses
          </p>
          <p className="mt-1 text-sm text-muted">
            You&apos;re a member at more than one place. Choose which business to use.
          </p>
        </>
      ) : null}
      <ul className={`${embedded ? "mt-0" : "mt-4"} grid gap-2`}>
        {salons.map((s) => {
          const isCurrent =
            s.salonSlug === currentSlug || s.salonId === currentSalonId;
          const switching = busySlug === s.salonSlug;
          return (
            <li key={s.salonId}>
              <button
                type="button"
                disabled={Boolean(busySlug) || isCurrent}
                onClick={() => void switchTo(s.salonSlug)}
                data-testid={`client-salon-option-${s.salonSlug}`}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  isCurrent
                    ? "border-[rgba(201,180,232,0.55)] bg-[rgba(201,180,232,0.14)]"
                    : "border-[color:var(--line)] hover:border-[rgba(201,180,232,0.4)]"
                } disabled:opacity-70`}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">
                    {s.salonName}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    {isCurrent ? "Current" : `Switch as ${s.memberName}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-champagne">
                  {switching ? "Opening…" : isCurrent ? "Active" : "Open"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error ? (
        <p className="mt-3 text-center text-sm text-[#f5a8a8]">{error}</p>
      ) : null}
    </section>
  );
}
