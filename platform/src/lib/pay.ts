export type PayType = "HOURLY" | "COMMISSION" | "BOTH";

export function normalizePayType(value: unknown): PayType {
  const v = String(value || "COMMISSION").toUpperCase();
  if (v === "HOURLY" || v === "BOTH") return v;
  return "COMMISSION";
}

export function dollarsToCents(raw: string | number) {
  const n = typeof raw === "number" ? raw : Number(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

/** Prompt for service charge; returns cents or null if cancelled/invalid. */
export function promptChargedCents(defaultCents: number): number | null {
  if (typeof window === "undefined") return defaultCents;
  const raw = window.prompt(
    "Service charge ($)",
    centsToDollars(defaultCents)
  );
  if (raw === null) return null;
  return dollarsToCents(raw);
}

/** Prompt for tip; empty/cancel with empty → 0; Cancel button → null to abort Done. */
export function promptTipCents(): number | null {
  if (typeof window === "undefined") return 0;
  const raw = window.prompt("Tip for stylist ($) — enter 0 if none", "0");
  if (raw === null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return 0;
  return dollarsToCents(trimmed);
}

export function promptCompleteAmounts(defaultServiceCents: number): {
  chargedCents: number;
  tipCents: number;
} | null {
  const chargedCents = promptChargedCents(defaultServiceCents);
  if (chargedCents == null) return null;
  const tipCents = promptTipCents();
  if (tipCents == null) return null;
  return { chargedCents, tipCents };
}

export function calcStylistPay(opts: {
  payType: string;
  hourlyRateCents?: number | null;
  commissionBps?: number | null;
  chargedCentsTotal: number;
  tipCentsTotal?: number;
  workedMinutes: number;
}) {
  const payType = normalizePayType(opts.payType);
  const hourlyRate = opts.hourlyRateCents ?? 0;
  const bps = opts.commissionBps ?? 0;
  const tips = opts.tipCentsTotal ?? 0;
  const hours = opts.workedMinutes / 60;
  const hourlyPay = Math.round(hours * hourlyRate);
  const commissionPay = Math.round((opts.chargedCentsTotal * bps) / 10_000);
  // Tips go 100% to the stylist on top of hourly/commission.
  let base = 0;
  if (payType === "HOURLY") base = hourlyPay;
  else if (payType === "BOTH") base = hourlyPay + commissionPay;
  else base = commissionPay;

  return {
    hourlyPay: payType === "COMMISSION" ? 0 : hourlyPay,
    commissionPay: payType === "HOURLY" ? 0 : commissionPay,
    tipPay: tips,
    totalPay: base + tips,
  };
}
