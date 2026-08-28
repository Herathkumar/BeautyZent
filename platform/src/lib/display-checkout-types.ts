export type CheckoutLineKind = "service" | "product";

export type CheckoutLine = {
  id: string;
  catalogId?: string;
  kind: CheckoutLineKind;
  name: string;
  durationMin?: number;
  priceCents: number;
  added?: boolean;
};

export type CheckoutTipMode =
  | { kind: "none" }
  | { kind: "percent"; pct: number }
  | { kind: "custom"; cents: number };

export type CheckoutBill = {
  appointmentId: string;
  clientId?: string;
  visitCount?: number;
  status: "PENDING" | "VERIFIED" | "PAID";
  chargedCents: number;
  taxPercent: number;
  taxCents: number;
  tipCents: number;
  tipMode: CheckoutTipMode;
  catalogCents: number;
  serviceCents: number;
  productCents: number;
  totalCents: number;
  adjustmentCents: number;
  catalogSubtotalCents: number;
  discountCents: number;
  discountLabel: string | null;
  loyaltyRedeemCents: number;
  loyaltyPointsRedeemed: number;
  loyaltyPointsEarned: number;
  isMember: boolean;
  loyaltyPointsBalance: number;
  redeemPointsEnabled: boolean;
  clientFirstName: string;
  stylistName: string;
  stylistPhotoUrl: string;
  salonName: string;
  visitTime: string;
  services: CheckoutLine[];
  products: CheckoutLine[];
  presentedAt: string;
};

export const TIP_PERCENTS = [15, 18, 20, 25] as const;
export const TIP_AMOUNTS_CENTS = [500, 1000, 2000] as const;
