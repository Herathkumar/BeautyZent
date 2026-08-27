"use client";

import { formatCad } from "@/lib/money";
import type { CheckoutBill, CheckoutTipMode } from "@/lib/display-checkout-types";
import { CheckoutTipPicker } from "@/components/display/CheckoutTipPicker";

export function CustomerCheckoutOverlay({
  bill,
  thanks,
  onLooksGood,
  onTip,
  onDismissThanks,
}: {
  bill: CheckoutBill | null;
  thanks: { firstName: string } | null;
  onLooksGood?: () => void;
  onTip?: (mode: CheckoutTipMode) => void;
  onDismissThanks?: () => void;
}) {
  if (!bill && !thanks) return null;
  const products = bill?.products || [];
  const tipMode = bill?.tipMode || { kind: "none" as const };
  const showingThanks = Boolean((thanks && !bill) || bill?.status === "PAID");

  return (
    <div
      className={`fixed inset-0 z-[80] flex items-center justify-center bg-[color:var(--cd-overlay)] px-4 py-6 backdrop-blur-[6px]${
        showingThanks ? " cursor-pointer" : ""
      }`}
      data-testid="customer-checkout-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="customer-checkout-title"
      onClick={showingThanks ? onDismissThanks : undefined}
      onKeyDown={
        showingThanks
          ? (e) => {
              if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDismissThanks?.();
              }
            }
          : undefined
      }
      tabIndex={showingThanks ? 0 : undefined}
    >
      <div className="relative max-h-[min(92vh,52rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-[color:var(--cd-line)] bg-[var(--cd-panel)] shadow-[var(--cd-shadow)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--cd-accent)_22%,transparent),transparent_70%)]" />
        {thanks && !bill ? (
          <div className="px-8 py-16 text-center sm:px-12" data-testid="customer-checkout-thanks">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-[color:var(--cd-accent)] uppercase">
              Paid
            </p>
            <h2
              id="customer-checkout-title"
              className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[color:var(--cd-heading)] sm:text-5xl"
            >
              Thank you, {thanks.firstName}
            </h2>
            <p className="mt-4 text-base text-[color:var(--cd-muted)]">
              You’re all set. We hope to see you again soon.
            </p>
            <p className="mt-6 text-xs tracking-[0.18em] text-[color:var(--cd-accent)] uppercase">
              Tap anywhere to close
            </p>
            <span className="mt-8 inline-block text-2xl text-[color:var(--cd-accent)]" aria-hidden>
              ✦
            </span>
          </div>
        ) : bill?.status === "PAID" ? (
          <div className="px-8 py-16 text-center sm:px-12" data-testid="customer-checkout-thanks">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-[color:var(--cd-accent)] uppercase">
              Paid
            </p>
            <h2
              id="customer-checkout-title"
              className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[color:var(--cd-heading)] sm:text-5xl"
            >
              Thank you, {bill.clientFirstName}
            </h2>
            <p className="mt-4 text-base text-[color:var(--cd-muted)]">
              You’re all set. We hope to see you again soon.
            </p>
            <p className="mt-6 text-xs tracking-[0.18em] text-[color:var(--cd-accent)] uppercase">
              Tap anywhere to close
            </p>
            <span className="mt-8 inline-block text-2xl text-[color:var(--cd-accent)]" aria-hidden>
              ✦
            </span>
          </div>
        ) : bill ? (
          <div className="relative px-6 py-8 sm:px-10 sm:py-10">
            <p className="text-center text-[11px] font-semibold tracking-[0.28em] text-[color:var(--cd-accent)] uppercase">
              {bill.salonName}
            </p>
            <h2
              id="customer-checkout-title"
              className="mt-2 text-center font-[family-name:var(--font-display)] text-3xl text-[color:var(--cd-heading)] sm:text-4xl"
            >
              Please review your visit
            </h2>
            <p className="mt-2 text-center text-sm text-[color:var(--cd-muted)]">
              Hi {bill.clientFirstName} — add a tip if you’d like, then confirm before paying.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3 text-sm text-[color:var(--cd-muted)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={bill.stylistPhotoUrl || "/avatars/stylist-neutral.svg"}
                alt=""
                className="h-10 w-10 rounded-full object-cover ring-2 ring-[color:var(--cd-accent-soft)]"
              />
              <span>
                With <span className="font-semibold text-[color:var(--cd-heading)]">{bill.stylistName}</span>
                <span className="text-[color:var(--cd-accent)]"> · </span>
                {bill.visitTime}
              </span>
            </div>

            <ul className="mt-7 divide-y divide-[color:var(--cd-line-soft)] border-y border-[color:var(--cd-line-soft)]">
              {bill.services.map((s) => (
                <li key={s.id} className="flex items-baseline gap-3 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-display)] text-lg text-[color:var(--cd-heading)]">
                      {s.name}
                    </p>
                    <p className="text-xs tracking-wide text-[color:var(--cd-muted)]">
                      {s.added ? "Added at desk" : s.durationMin ? `${s.durationMin} min` : "Service"}
                    </p>
                  </div>
                  <p className="shrink-0 font-[family-name:var(--font-display)] text-lg tabular-nums text-[color:var(--cd-heading)]">
                    {formatCad(s.priceCents)}
                  </p>
                </li>
              ))}
              {products.map((p) => (
                <li key={p.id} className="flex items-baseline gap-3 py-3.5" data-testid="checkout-product-line">
                  <div className="min-w-0 flex-1">
                    <p className="font-[family-name:var(--font-display)] text-lg text-[color:var(--cd-heading)]">
                      {p.name}
                    </p>
                    <p className="text-xs tracking-wide text-[color:var(--cd-muted)]">Retail</p>
                  </div>
                  <p className="shrink-0 font-[family-name:var(--font-display)] text-lg tabular-nums text-[color:var(--cd-heading)]">
                    {formatCad(p.priceCents)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-1.5 text-sm text-[color:var(--cd-muted)]">
              <div className="flex justify-between">
                <span>Services</span>
                <span className="tabular-nums">{formatCad(bill.serviceCents ?? bill.chargedCents)}</span>
              </div>
              {bill.productCents ? (
                <div className="flex justify-between">
                  <span>Products</span>
                  <span className="tabular-nums">{formatCad(bill.productCents)}</span>
                </div>
              ) : null}
              {bill.taxCents > 0 ? (
                <div className="flex justify-between" data-testid="customer-checkout-tax">
                  <span>HST {bill.taxPercent}%</span>
                  <span className="tabular-nums">{formatCad(bill.taxCents)}</span>
                </div>
              ) : null}
            </div>

            {onTip && bill.status !== "PAID" ? (
              <div className="mt-6">
                <CheckoutTipPicker
                  chargedCents={bill.chargedCents}
                  tipMode={tipMode}
                  onChange={onTip}
                  variant="customer"
                />
              </div>
            ) : (
              <div className="mt-4 flex justify-between text-sm text-[color:var(--cd-muted)]">
                <span>Tip</span>
                <span className="tabular-nums">{formatCad(bill.tipCents)}</span>
              </div>
            )}

            <div className="mt-5 flex items-end justify-between border-t border-[color:var(--cd-line-soft)] pt-4">
              <span className="text-xs font-semibold tracking-[0.2em] text-[color:var(--cd-accent)] uppercase">
                Amount due
              </span>
              <p className="font-[family-name:var(--font-display)] text-4xl tabular-nums text-[color:var(--cd-heading)]">
                {formatCad(bill.totalCents)}
              </p>
            </div>

            {bill.status === "VERIFIED" ? (
              <p className="mt-6 rounded-2xl bg-[var(--cd-input)] px-4 py-3 text-center text-sm font-medium text-[color:var(--cd-muted)]">
                Looks right — pay at the front desk when you’re ready.
              </p>
            ) : (
              <div className="mt-6 grid gap-3">
                {onLooksGood ? (
                  <button
                    type="button"
                    onClick={onLooksGood}
                    className="touch-manipulation min-h-[3.5rem] rounded-full bg-[var(--cd-accent)] px-6 py-3.5 text-sm font-semibold tracking-wide text-[color:var(--cd-on-accent)] uppercase"
                    data-testid="customer-checkout-confirm"
                  >
                    This looks right
                  </button>
                ) : null}
                <p className="text-center text-xs tracking-wide text-[color:var(--cd-muted)]">
                  Pay at reception when you’re ready. This screen closes after checkout.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
