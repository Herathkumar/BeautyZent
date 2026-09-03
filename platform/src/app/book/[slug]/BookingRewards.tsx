"use client";

import { useEffect, useState } from "react";
import type { PromoBoardTemplate } from "@/lib/promotion-board";
import { formatCad } from "@/lib/money";
import { LuxeCrown, LuxeOrnament, LuxeSheet, MemberBadge, memberTierFromPoints, memberTierLabel } from "./luxe";
import { GoldLogoLoader } from "@/components/GoldLogoSpin";

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
      ) : (
        <button type="button" className="btn-solid mt-3 rounded-full px-4 py-2 text-xs font-bold tracking-[0.14em]">
          CLAIM
        </button>
      )}
    </article>
  );
}

export function BookingRewards({
  slug,
  salonName,
  open,
  signedIn,
  photoUrl,
  onClose,
  onSignInRequest,
  onJoinRequest,
}: {
  slug: string;
  salonName?: string | null;
  open: boolean;
  signedIn: boolean;
  photoUrl?: string | null;
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
    <LuxeSheet label="My Wallet">
      <div className="flex min-h-0 flex-1 flex-col" data-testid="book-rewards">
        <div className="shrink-0 px-5 pt-[max(0.85rem,env(safe-area-inset-top))]">
          <div className="book-luxe-bookings-header">
            <div className="min-w-0 text-center">
              <h2 className="book-luxe-title text-3xl">My Wallet</h2>
              <LuxeOrnament className="mx-auto mt-2 max-w-[8rem]" />
              <p className="mt-2 text-xs text-muted">
                {salonName?.trim() || data?.salonName || "Exclusive perks"}
              </p>
            </div>
          </div>
        </div>

        <div className="book-luxe-sheet-scroll space-y-5 px-5 pt-4">
          {loading ? <GoldLogoLoader size={64} label="Loading rewards" /> : null}
          {error ? <p className="text-sm text-[#f5a8a8]">{error}</p> : null}

          {!loading && loyalty?.enabled ? (
            <section data-testid="book-loyalty-card">
              {signedIn ? (
                <div className="book-luxe-member mb-4">
                  <span className="book-luxe-member__avatar shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoUrl || "/avatars/client-neutral.svg"}
                      alt=""
                      className="h-full w-full rounded-full object-cover"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] text-muted">Member</span>
                    <span className="block font-[family-name:var(--font-display)] text-xl text-white">
                      {loyalty.clientName || "Member"}
                    </span>
                    <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-champagne">
                      <LuxeCrown className="h-3.5 w-3.5" />
                      {memberTierLabel(memberTierFromPoints(loyalty.points))}
                      <span aria-hidden>›</span>
                    </span>
                  </span>
                  <MemberBadge tier={memberTierFromPoints(loyalty.points)} />
                </div>
              ) : null}
              <div className="rounded-3xl border-2 border-[color:var(--champagne)]/55 p-5">
              <p className="book-luxe-kicker">Rewards points balance</p>
              {signedIn && loyalty.points != null ? (
                <>
                  <p className="mt-2 font-[family-name:var(--font-display)] text-5xl text-champagne tabular-nums">
                    {loyalty.points.toLocaleString()}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    {formatCad(loyalty.redeemValueCents ?? 0)} ready to redeem at checkout
                  </p>
                  {loyalty.visitCount != null ? (
                    <p className="mt-2 text-xs text-champagne">
                      Visit streak · {loyalty.visitCount} visit
                      {loyalty.visitCount === 1 ? "" : "s"}
                    </p>
                  ) : null}
                  {!loyalty.isMember ? (
                    <p className="mt-3 text-sm text-champagne">
                      Ask reception to verify your membership for member-only offers.
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-white">
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
                      className="rounded-full border border-[color:var(--champagne)]/45 px-5 py-2.5 text-sm font-semibold text-champagne"
                    >
                      Join
                    </button>
                  </div>
                </>
              )}

              <div className="mt-4 grid gap-2 rounded-2xl border border-[color:var(--line)] p-3 text-xs text-muted sm:grid-cols-2">
                <p>
                  Earn <span className="text-white">{loyalty.pointsPerDollar}</span> point
                  {loyalty.pointsPerDollar === 1 ? "" : "s"} per $1 spent
                </p>
                <p>
                  Redeem up to{" "}
                  <span className="text-white">{loyalty.maxRedeemPercent}%</span> of a visit
                </p>
                <p className="sm:col-span-2">
                  100 pts ≈ {valuePer100} off at checkout
                </p>
              </div>
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
                <h3 className="font-[family-name:var(--font-display)] text-xl text-white">
                  Offers & promotions
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
    </LuxeSheet>
  );
}
