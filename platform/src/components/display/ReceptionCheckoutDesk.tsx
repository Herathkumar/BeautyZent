"use client";

import { formatCad } from "@/lib/money";
import type { CheckoutBill, CheckoutLineKind } from "@/lib/display-checkout-types";
import { ReceptionQuickServices } from "@/components/display/ReceptionQuickServices";

type CatalogItem = { id: string; name: string; priceCents: number; durationMin?: number };

export function ReceptionCheckoutDesk({
  bill,
  busy,
  slug,
  services,
  products,
  onAddLine,
  onRemoveLine,
  onComplete,
  onCancel,
  onRedeemPoints,
}: {
  bill: CheckoutBill;
  busy?: boolean;
  slug: string;
  services: CatalogItem[];
  products: CatalogItem[];
  onAddLine: (kind: CheckoutLineKind, catalogId: string) => void;
  onRemoveLine: (lineId: string) => void;
  onComplete: () => void;
  onCancel: () => void;
  onRedeemPoints?: (enabled: boolean) => void;
}) {
  const extraProducts = bill.products || [];
  const confirmed = bill.status === "VERIFIED";

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-4 py-6"
      data-testid="reception-checkout-desk"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reception-checkout-title"
    >
      <div className="flex max-h-[min(92vh,52rem)] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#16181f] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="shrink-0 border-b border-white/8 px-6 py-5">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#c45b7a] uppercase">
            Customer display
          </p>
          <h2 id="reception-checkout-title" className="mt-1 text-lg font-semibold text-white">
            Bill is on the waiting-room screen
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Add extras here — {bill.clientFirstName} can add a tip on the waiting-room screen.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <div className="mb-4 flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={bill.stylistPhotoUrl || "/avatars/stylist-neutral.svg"}
              alt=""
              className="h-9 w-9 rounded-full object-cover ring-2 ring-white/15"
            />
            <p className="text-sm text-white/70">
              {bill.clientFirstName}
              <span className="text-white/30"> · </span>
              {bill.stylistName}
              <span className="text-white/30"> · </span>
              {bill.visitTime}
            </p>
          </div>

          <ul className="divide-y divide-white/8 rounded-2xl border border-white/8 bg-black/20 px-4">
            {bill.services.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                <span className="min-w-0 truncate text-sm text-white/85">
                  {s.name}
                  {s.added ? <span className="ml-2 text-[10px] text-white/40">added</span> : null}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-sm tabular-nums text-white/70">{formatCad(s.priceCents)}</span>
                  {s.added ? (
                    <button
                      type="button"
                      onClick={() => onRemoveLine(s.id)}
                      className="text-xs text-white/35 hover:text-white"
                      aria-label={`Remove ${s.name}`}
                    >
                      ×
                    </button>
                  ) : null}
                </span>
              </li>
            ))}
            {extraProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2.5" data-testid="checkout-product-line">
                <span className="min-w-0 truncate text-sm text-white/85">
                  {p.name}
                  <span className="ml-2 text-[10px] text-white/40">product</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="text-sm tabular-nums text-white/70">{formatCad(p.priceCents)}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveLine(p.id)}
                    className="text-xs text-white/35 hover:text-white"
                    aria-label={`Remove ${p.name}`}
                  >
                    ×
                  </button>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold tracking-wide text-white/40 uppercase">
                Add service
              </span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) onAddLine("service", id);
                  e.target.value = "";
                }}
                className="reception-catalog-select w-full rounded-xl border border-white/10 bg-[#1a1c24] px-3 py-2.5 text-sm text-white"
                data-testid="reception-add-service"
              >
                <option value="">Select…</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {formatCad(s.priceCents)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-semibold tracking-wide text-white/40 uppercase">
                Add product
              </span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) onAddLine("product", id);
                  e.target.value = "";
                }}
                className="reception-catalog-select w-full rounded-xl border border-white/10 bg-[#1a1c24] px-3 py-2.5 text-sm text-white"
                data-testid="reception-add-product"
              >
                <option value="">Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatCad(p.priceCents)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-5">
            <ReceptionQuickServices
              slug={slug}
              services={services}
              onAdd={(serviceId) => onAddLine("service", serviceId)}
            />
          </div>

          <div className="mt-4 space-y-1.5 border-t border-white/8 pt-4 text-sm text-white/50">
            <div className="flex items-center justify-between">
              <span>Subtotal</span>
              <span className="tabular-nums">
                {formatCad(bill.catalogSubtotalCents ?? bill.chargedCents)}
              </span>
            </div>
            {bill.discountCents > 0 ? (
              <div
                className="flex items-center justify-between text-emerald-300"
                data-testid="reception-checkout-discount"
              >
                <span>{bill.discountLabel || "Discount"}</span>
                <span className="tabular-nums">−{formatCad(bill.discountCents)}</span>
              </div>
            ) : null}
            {bill.loyaltyRedeemCents > 0 ? (
              <div className="flex items-center justify-between text-emerald-300">
                <span>Loyalty points ({bill.loyaltyPointsRedeemed} pts)</span>
                <span className="tabular-nums">−{formatCad(bill.loyaltyRedeemCents)}</span>
              </div>
            ) : null}
            {bill.isMember && bill.loyaltyPointsBalance > 0 ? (
              <label className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-white/70">
                <span>
                  Redeem points
                  <span className="block text-[11px] text-white/40">
                    Balance: {bill.loyaltyPointsBalance} pts
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={bill.redeemPointsEnabled}
                  onChange={(e) => onRedeemPoints?.(e.target.checked)}
                  data-testid="reception-redeem-points"
                />
              </label>
            ) : null}
            {bill.isMember && bill.loyaltyPointsEarned > 0 ? (
              <p className="text-xs text-emerald-300/90" data-testid="reception-loyalty-earn">
                Earns {bill.loyaltyPointsEarned} points after payment
              </p>
            ) : null}
            {bill.taxCents > 0 ? (
              <div className="flex items-center justify-between" data-testid="reception-checkout-tax">
                <span>HST {bill.taxPercent}%</span>
                <span className="tabular-nums">{formatCad(bill.taxCents)}</span>
              </div>
            ) : null}
            {bill.tipCents > 0 ? (
              <div className="flex items-center justify-between">
                <span>Tip</span>
                <span className="tabular-nums">{formatCad(bill.tipCents)}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between pt-1 text-white">
              <span className="text-xs tracking-wide text-white/40 uppercase">Amount due</span>
              <span className="text-2xl font-semibold tabular-nums">
                {formatCad(bill.totalCents)}
              </span>
            </div>
          </div>

          {confirmed ? (
            <p className="mt-3 rounded-xl bg-emerald-500/12 px-3 py-2 text-center text-sm text-emerald-300">
              Customer confirmed the details.
            </p>
          ) : (
            <p className="mt-3 text-center text-xs text-white/40">
              Waiting for the guest to review or add a tip on the customer display.
            </p>
          )}
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-white/8 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-2xl border border-white/12 py-3 text-sm font-semibold text-white/70 hover:text-white"
          >
            Cancel
          </button>
          {!confirmed ? (
            <button
              type="button"
              onClick={onComplete}
              disabled={busy}
              className="rounded-2xl bg-[#1f6b5a] py-3 text-sm font-semibold text-white disabled:opacity-60"
              data-testid="reception-payment-received"
            >
              {busy ? "Saving…" : "Payment received"}
            </button>
          ) : (
            <span className="rounded-2xl bg-[#1f6b5a]/40 py-3 text-center text-sm font-semibold text-white/50">
              Guest confirmed
            </span>
          )}
        </div>
      </div>

      {confirmed ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 px-4"
          data-testid="reception-customer-confirmed"
          role="alertdialog"
          aria-labelledby="reception-confirmed-title"
          aria-describedby="reception-confirmed-amount"
        >
          <div className="w-full max-w-sm rounded-[1.75rem] border border-emerald-400/30 bg-[#12241f] px-6 py-7 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-emerald-300 uppercase">
              Customer confirmed
            </p>
            <h3 id="reception-confirmed-title" className="mt-2 text-2xl font-semibold text-white">
              {bill.clientFirstName} is ready to pay
            </h3>
            <p id="reception-confirmed-amount" className="mt-4 text-sm text-white/55">
              Amount due
            </p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-white">
              {formatCad(bill.totalCents)}
            </p>
            <button
              type="button"
              onClick={onComplete}
              disabled={busy}
              className="mt-6 w-full rounded-2xl bg-[#1f6b5a] py-3.5 text-sm font-semibold text-white disabled:opacity-60"
              data-testid="reception-payment-received"
            >
              {busy ? "Saving…" : "Payment received"}
            </button>
            <p className="mt-3 text-xs text-white/40">
              Collect payment, then tap to close this bill.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
