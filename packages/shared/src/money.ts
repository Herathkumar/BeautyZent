/** Amounts are stored as integer cents. */
export function formatMoney(cents: number, currency = "CAD"): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function calcLineTotal(unitPriceCents: number, qty: number): number {
  return unitPriceCents * qty;
}

export function calcTax(subtotalCents: number, taxBps: number): number {
  return Math.round((subtotalCents * taxBps) / 10000);
}
