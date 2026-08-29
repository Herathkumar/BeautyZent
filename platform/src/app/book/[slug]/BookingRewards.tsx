"use client";

import { useEffect, useState } from "react";
import type { PromoBoardTemplate } from "@/lib/promotion-board";
import { formatCad } from "@/lib/money";

type OfferProgress = {
  kind: "visits";
  current: number;
  target: number;
  remaining: number;
  nextVisitUnlocks: boolean;
  passed: boolean;
};

type LoyaltyPayload = {
  salonName: string;
  loyalty: {
    enabled: boolean;
    points: number | null;
    isMember: boolean;
    clientName: string | null;
    visitCount: number | null;
    pointsPerDollar: number;
    centsPerPoint: number;
    maxRedeemPercent: number;
    redeemValueCents: number | null;
  };
  offers: {
    enabled: boolean;
    items: Array<{
      id: string;
      type: string;
      name: string;
      label: string;
      template: PromoBoardTemplate;
      minVisits: number | null;
      progress: OfferProgress | null;
    }>;
  };
};

function VisitProgressBar({ progress }: { progress: OfferProgress }) {
  const pct = Math.max(
    0,
    Math.min(100, progress.target > 0 ? (progress.current / progress.target) * 100 : 0)
  );
  let status: string;
  if (progress.passed) {
    status =
      progress.target === 1
        ? "Welcome offer already used"
        : `Milestone reached — applied on visit #${progress.target}`;
  } else if (progress.nextVisitUnlocks) {
    status =
      progress.remaining === 1
        ? "1 visit left — your next booking unlocks this offer"
        : "Your next visit unlocks this offer";
  } else {
    status = `${progress.remaining} visit${progress.remaining === 1 ? "" : "s"} to go`;
  }

  return (
    <div className="mt-3 space-y-2" data-testid="book-offer-visit-progress">
      <div className="flex items-end justify-between gap-2">
        <p className="text-sm font-semibold text-ink tabular-nums">
          {progress.current}
          <span className="text-muted"> / {progress.target} visits</span>
        </p>
        <p
          className={`text-xs font-medium ${
            progress.passed
              ? "text-muted"
              : progress.nextVisitUnlocks
                ? "text-champagne"
                : "text-muted"
          }`}
        >
          {status}
        </p>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[color:var(--line)]">
        <div
          className="h-full rounded-full bg-champagne transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OfferCard({
  label,
  template,
  progress,
  signedIn,
  showVisitHint,
  onSignInRequest,
}: {
  label: string;
  template: PromoBoardTemplate;
  progress: OfferProgress | null;
  signedIn: boolean;
  showVisitHint: boolean;
  onSignInRequest: () => void;
}) {
  return (
    <article
      className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)] p-4"
      data-testid="book-reward-offer"
    >
      <p className="text-[10px] font-semibold tracking-[0.16em] text-champagne uppercase">
        {template.eyebrow}
      </p>
      <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl leading-tight text-ink">
        {template.headline}
        {template.headlineAccent ? (
          <span className="text-champagne italic"> {template.headlineAccent}</span>
        ) : null}
      </h3>
      <p className="mt-2 text-lg font-semibold tracking-wide text-champagne">{template.offer}</p>
      <p className="mt-1 text-sm text-muted">{template.description}</p>
      {label && label !== template.headline ? (
        <p className="mt-2 text-xs text-muted">{label}</p>
      ) : null}

      {progress ? (
        <VisitProgressBar progress={progress} />
      ) : !signedIn && showVisitHint ? (
        <div className="mt-3 rounded-xl border border-[color:var(--line)] px-3 py-2.5">
          <p className="text-xs text-muted">Sign in to track visits toward this offer.</p>
          <button
            type="button"
            onClick={onSignInRequest}
            className="mt-2 text-xs font-semibold text-champagne"
          >
            Sign in
          </button>
        </div>
      ) : null}
    </article>
  );
}

export function BookingRewards({
  slug,
  salonName,
  open,
  signedIn,
  onClose,
  onSignInRequest,
  onJoinRequest,
}: {
  slug: string;
  salonName?: string | null;
  open: boolean;
  signedIn: boolean;
  onClose: () => void;
  onSignInRequest: () => void;
  onJoinRequest: () => void;
}) {
  const [data, setData] = useState<LoyaltyPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError("");
    fetch(`/api/public/${slug}/loyalty`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load rewards");
        setData(d as LoyaltyPayload);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"))
      .finally(() => setLoading(false));
  }, [open, slug, signedIn]);

  if (!open) return null;

  const loyalty = data?.loyalty;
  const offers = data?.offers;
  const valuePer100 = loyalty ? formatCad(100 * (loyalty.centsPerPoint || 5)) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 sm:items-center sm:p-3">
      <div
        className="book-theme book-card flex h-[92dvh] w-full max-w-lg flex-col rounded-t-3xl shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-auto sm:max-h-[88dvh] sm:rounded-3xl"
        role="dialog"
        aria-label="Rewards"
        data-testid="book-rewards"
      >
        <div className="shrink-0 px-5 pt-4">
          <div
            aria-hidden
            className="mx-auto mb-3 h-1 w-10 rounded-full bg-[color:var(--line)] sm:hidden"
          />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-champagne uppercase">
                {salonName?.trim() || data?.salonName || "Salon"}
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl">
                Rewards
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[color:var(--line)] px-3 py-1.5 text-sm text-muted"
            >
              Close
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {loading ? <p className="py-8 text-center text-muted">Loading rewards…</p> : null}
          {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}

          {!loading && loyalty?.enabled ? (
            <section
              className="rounded-3xl border border-[color:var(--line)] bg-[linear-gradient(160deg,color-mix(in_srgb,var(--champagne)_18%,transparent),transparent_55%)] p-5"
              data-testid="book-loyalty-card"
            >
              <p className="text-[10px] font-semibold tracking-[0.16em] text-champagne uppercase">
                Loyalty points
              </p>
              {signedIn && loyalty.points != null ? (
                <>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-4xl text-ink tabular-nums">
                    {loyalty.points}
                    <span className="ml-2 text-base font-sans tracking-normal text-muted">
                      pts
                    </span>
                  </p>
                  {loyalty.redeemValueCents != null && loyalty.redeemValueCents > 0 ? (
                    <p className="mt-1 text-sm text-muted">
                      Worth about {formatCad(loyalty.redeemValueCents)} at checkout
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted">
                      Earn points on every visit and redeem at reception.
                    </p>
                  )}
                  {!loyalty.isMember ? (
                    <p className="mt-3 text-sm text-champagne">
                      Ask reception to verify your membership for member-only offers.
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-muted">Member account active</p>
                  )}
                </>
              ) : (
                <>
                  <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-ink">
                    Earn as you visit
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    Sign in to see your points balance. Members earn{" "}
                    <span className="text-champagne">
                      {loyalty.pointsPerDollar} pt per $1
                    </span>
                    {valuePer100 ? (
                      <>
                        {" "}
                        and can redeem 100 pts for about {valuePer100} off.
                      </>
                    ) : (
                      "."
                    )}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onSignInRequest}
                      className="btn-solid rounded-full px-5 py-2.5 text-sm font-semibold"
                    >
                      Sign in
                    </button>
                    <button
                      type="button"
                      onClick={onJoinRequest}
                      className="rounded-full border border-[color:var(--line)] px-5 py-2.5 text-sm font-semibold text-champagne"
                    >
                      Join
                    </button>
                  </div>
                </>
              )}

              <div className="mt-4 grid gap-2 rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/60 p-3 text-xs text-muted sm:grid-cols-2">
                <p>
                  Earn <span className="text-ink">{loyalty.pointsPerDollar}</span> point
                  {loyalty.pointsPerDollar === 1 ? "" : "s"} per $1 spent
                </p>
                <p>
                  Redeem up to{" "}
                  <span className="text-ink">{loyalty.maxRedeemPercent}%</span> of a visit
                </p>
                <p className="sm:col-span-2">
                  100 pts ≈ {valuePer100} off at checkout
                </p>
              </div>
            </section>
          ) : null}

          {!loading && !loyalty?.enabled && !offers?.enabled ? (
            <p className="py-8 text-center text-muted">
              Rewards and offers are not enabled for this salon yet.
            </p>
          ) : null}

          {!loading && offers ? (
            <section className="space-y-3">
              <div>
                <h3 className="font-[family-name:var(--font-display)] text-xl text-ink">
                  Current offers
                </h3>
                <p className="mt-1 text-sm text-muted">
                  Promotions set up by the salon — applied at reception checkout when you
                  qualify.
                </p>
              </div>
              {offers.enabled && offers.items.length ? (
                <div className="grid gap-3">
                  {offers.items.map((item) => (
                    <OfferCard
                      key={item.id}
                      label={item.label}
                      template={item.template}
                      progress={item.progress}
                      signedIn={signedIn}
                      showVisitHint={
                        item.type === "VISIT_MILESTONE" || item.type === "FIRST_VISIT"
                      }
                      onSignInRequest={onSignInRequest}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl border border-[color:var(--line)] px-4 py-5 text-sm text-muted">
                  No active offers right now. Check back soon.
                </p>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
