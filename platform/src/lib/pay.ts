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

/** Prompt for charged amount; returns cents or null if cancelled/invalid. */
export function promptChargedCents(defaultCents: number): number | null {
  if (typeof window === "undefined") return defaultCents;
  const raw = window.prompt(
    "Amount charged for this service ($)",
    centsToDollars(defaultCents)
  );
  if (raw === null) return null;
  return dollarsToCents(raw);
}

export function calcStylistPay(opts: {
  payType: string;
  hourlyRateCents?: number | null;
  commissionBps?: number | null;
  chargedCentsTotal: number;
  workedMinutes: number;
}) {
  const payType = normalizePayType(opts.payType);
  const hourlyRate = opts.hourlyRateCents ?? 0;
  const bps = opts.commissionBps ?? 0;
  const hours = opts.workedMinutes / 60;
  const hourlyPay = Math.round(hours * hourlyRate);
  const commissionPay = Math.round((opts.chargedCentsTotal * bps) / 10_000);

  if (payType === "HOURLY") return { hourlyPay, commissionPay: 0, totalPay: hourlyPay };
  if (payType === "BOTH") {
    return { hourlyPay, commissionPay, totalPay: hourlyPay + commissionPay };
  }
  return { hourlyPay: 0, commissionPay, totalPay: commissionPay };
}
