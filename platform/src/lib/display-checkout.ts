import { firstName, formatClock } from "@/lib/display-schedule";
import type {
  CheckoutBill,
  CheckoutLine,
  CheckoutTipMode,
} from "@/lib/display-checkout-types";
import {
  evaluateCheckoutPromotions,
  type PromotionRuleRecord,
  type SalonPromoSettings,
} from "@/lib/promotions";
import { prisma } from "@/lib/prisma";
import { stylistPhotoUrl } from "@/lib/stylist-photo";

export type { CheckoutBill, CheckoutLine, CheckoutTipMode } from "@/lib/display-checkout-types";

export const CHECKOUT_STALE_MS = 30 * 60 * 1000;
const PAID_HOLD_MS = 8_000;

type CheckoutRow = {
  salonId: string;
  appointmentId: string;
  chargedCents: number;
  tipCents: number;
  status: "PENDING" | "VERIFIED" | "PAID";
  presentedAt: Date;
  updatedAt: Date;
  bill: CheckoutBill;
};

/** One live bill per salon — same Node process serves reception + customer TV. */
const g = globalThis as typeof globalThis & {
  __salonDisplayCheckout?: Map<string, CheckoutRow>;
};
if (!g.__salonDisplayCheckout) g.__salonDisplayCheckout = new Map();
const sessions = g.__salonDisplayCheckout;

export function getCheckoutRow(salonId: string): CheckoutRow | undefined {
  return sessions.get(salonId);
}

export function upsertCheckout(row: CheckoutRow) {
  sessions.set(row.salonId, row);
}

export function clearCheckout(salonId: string) {
  sessions.delete(salonId);
}

export const DEFAULT_TAX_PERCENT = 13;

export function clampTaxPercent(raw: unknown, fallback = DEFAULT_TAX_PERCENT) {
  const value = Math.round(Number(raw));
  if (!Number.isFinite(value)) return fallback;
  return Math.max(0, Math.min(50, value));
}

export function taxCentsFor(chargedCents: number, taxPercent: number) {
  if (taxPercent <= 0 || chargedCents <= 0) return 0;
  return Math.round((chargedCents * taxPercent) / 100);
}

export function tipCentsFor(chargedCents: number, mode: CheckoutTipMode) {
  if (mode.kind === "none") return 0;
  if (mode.kind === "percent") return Math.round((chargedCents * mode.pct) / 100);
  return Math.max(0, Math.round(mode.cents));
}

const DEFAULT_PROMO_SETTINGS: SalonPromoSettings = {
  loyaltyEnabled: false,
  discountsEnabled: false,
  loyaltyPointsPerDollar: 1,
  loyaltyCentsPerPoint: 5,
  loyaltyMaxRedeemPercent: 50,
};

function defaultBillFields(): Pick<
  CheckoutBill,
  | "catalogSubtotalCents"
  | "discountCents"
  | "discountLabel"
  | "loyaltyRedeemCents"
  | "loyaltyPointsRedeemed"
  | "loyaltyPointsEarned"
  | "isMember"
  | "loyaltyPointsBalance"
  | "redeemPointsEnabled"
> {
  return {
    catalogSubtotalCents: 0,
    discountCents: 0,
    discountLabel: null,
    loyaltyRedeemCents: 0,
    loyaltyPointsRedeemed: 0,
    loyaltyPointsEarned: 0,
    isMember: false,
    loyaltyPointsBalance: 0,
    redeemPointsEnabled: false,
  };
}

export function settleBill(
  bill: CheckoutBill,
  tipMode = bill.tipMode || { kind: "none" as const },
  promo?: {
    settings: SalonPromoSettings;
    rules: PromotionRuleRecord[];
  }
): CheckoutBill {
  const services = (bill.services || []).map((s, i) => ({
    ...s,
    id: s.id || `svc-${i}`,
    kind: "service" as const,
  }));
  const products = (bill.products || []).map((s, i) => ({
    ...s,
    id: s.id || `prd-${i}`,
    kind: "product" as const,
  }));
  const serviceCents = services.reduce((sum, s) => sum + s.priceCents, 0);
  const productCents = products.reduce((sum, s) => sum + s.priceCents, 0);
  const catalogSubtotalCents = serviceCents + productCents;
  const catalogCents = services.filter((s) => !s.added).reduce((sum, s) => sum + s.priceCents, 0);
  const settings = promo?.settings || DEFAULT_PROMO_SETTINGS;
  const rules = promo?.rules || [];
  const promoResult = evaluateCheckoutPromotions(
    catalogSubtotalCents,
    settings,
    rules,
    {
      isMember: bill.isMember,
      visitCount: bill.visitCount ?? 0,
      loyaltyPointsBalance: bill.loyaltyPointsBalance,
      redeemPointsEnabled: bill.redeemPointsEnabled,
    }
  );
  const chargedCents = promoResult.chargedCents;
  const taxPercent = clampTaxPercent(bill.taxPercent);
  const taxCents = taxCentsFor(chargedCents, taxPercent);
  const tipCents = tipCentsFor(chargedCents, tipMode);
  return {
    ...bill,
    services,
    products,
    tipMode,
    catalogCents,
    serviceCents,
    productCents,
    catalogSubtotalCents,
    discountCents: promoResult.discountCents,
    discountLabel: promoResult.discountLabel,
    loyaltyRedeemCents: promoResult.loyaltyRedeemCents,
    loyaltyPointsRedeemed: promoResult.loyaltyPointsRedeemed,
    loyaltyPointsEarned: promoResult.loyaltyPointsEarned,
    adjustmentCents: promoResult.adjustmentCents,
    chargedCents,
    taxPercent,
    taxCents,
    tipCents,
    totalCents: chargedCents + taxCents + tipCents,
  };
}

export async function loadPromoBundle(salonId: string) {
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      loyaltyEnabled: true,
      discountsEnabled: true,
      loyaltyPointsPerDollar: true,
      loyaltyCentsPerPoint: true,
      loyaltyMaxRedeemPercent: true,
      promotionRules: {
        where: { enabled: true },
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          type: true,
          name: true,
          enabled: true,
          discountBps: true,
          discountCents: true,
          minVisits: true,
          minSpendCents: true,
          membersOnly: true,
          sortOrder: true,
        },
      },
    },
  });
  if (!salon) {
    return { settings: DEFAULT_PROMO_SETTINGS, rules: [] as PromotionRuleRecord[] };
  }
  return {
    settings: {
      loyaltyEnabled: salon.loyaltyEnabled,
      discountsEnabled: salon.discountsEnabled,
      loyaltyPointsPerDollar: salon.loyaltyPointsPerDollar,
      loyaltyCentsPerPoint: salon.loyaltyCentsPerPoint,
      loyaltyMaxRedeemPercent: salon.loyaltyMaxRedeemPercent,
    },
    rules: salon.promotionRules,
  };
}

async function clientVisitCount(salonId: string, clientId: string) {
  return prisma.appointment.count({
    where: { salonId, clientId, status: "COMPLETED" },
  });
}

export async function loadCheckoutBill(salonId: string): Promise<CheckoutBill | null> {
  const row = sessions.get(salonId);
  if (!row?.bill) return null;
  if (row.status === "PAID" && Date.now() - row.updatedAt.getTime() > PAID_HOLD_MS) {
    clearCheckout(salonId);
    return null;
  }
  if (Date.now() - row.presentedAt.getTime() > CHECKOUT_STALE_MS) {
    clearCheckout(salonId);
    return null;
  }
  const promo = await loadPromoBundle(salonId);
  const bill = settleBill({ ...row.bill, status: row.status }, row.bill.tipMode || { kind: "none" }, promo);
  row.chargedCents = bill.chargedCents;
  row.tipCents = bill.tipCents;
  row.bill = bill;
  return bill;
}

export async function buildCheckoutBill(
  salonId: string,
  appointmentId: string,
  chargedCents: number,
  tipCents: number,
  status: CheckoutBill["status"],
  timeZone?: string | null
): Promise<CheckoutBill | null> {
  let salon: {
    name: string;
    timezone: string;
    taxPercent?: number;
  } | null = null;
  try {
    salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { name: true, timezone: true, taxPercent: true },
    });
  } catch {
    salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { name: true, timezone: true },
    });
  }
  if (!salon) return null;

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, salonId },
    select: {
      id: true,
      status: true,
      startsAt: true,
      bookingGroupId: true,
      client: {
        select: {
          id: true,
          name: true,
          memberAt: true,
          loyaltyPoints: true,
        },
      },
      service: { select: { id: true, name: true, durationMin: true, priceCents: true } },
      stylist: {
        select: {
          name: true,
          gender: true,
          photoMime: true,
          photoUpdatedAt: true,
          id: true,
        },
      },
    },
  });
  if (!appt) return null;

  const visitCount = await clientVisitCount(salonId, appt.client.id);
  const promo = await loadPromoBundle(salonId);

  const siblingStatus =
    status === "PAID"
      ? (["BOOKED", "CHECKED_IN", "COMPLETED"] as const)
      : (["BOOKED", "CHECKED_IN"] as const);
  const siblings = appt.bookingGroupId
    ? await prisma.appointment.findMany({
        where: {
          salonId,
          bookingGroupId: appt.bookingGroupId,
          status: { in: [...siblingStatus] },
        },
        select: {
          id: true,
          service: { select: { id: true, name: true, durationMin: true, priceCents: true } },
        },
        orderBy: { startsAt: "asc" },
      })
    : [{ id: appt.id, service: appt.service }];

  const services: CheckoutLine[] = (siblings.length ? siblings : [{ id: appt.id, service: appt.service }]).map(
    (s) => ({
      id: `visit-${s.id}`,
      catalogId: s.service.id,
      kind: "service" as const,
      name: s.service.name,
      durationMin: s.service.durationMin,
      priceCents: s.service.priceCents,
      added: false,
    })
  );
  const tz = timeZone || salon.timezone;
  const tipMode: CheckoutTipMode =
    tipCents > 0 ? { kind: "custom", cents: tipCents } : { kind: "none" };

  return settleBill(
    {
      appointmentId: appt.id,
      clientId: appt.client.id,
      status,
      chargedCents,
      taxPercent: clampTaxPercent(salon.taxPercent),
      taxCents: 0,
      tipCents,
      tipMode,
      catalogCents: 0,
      serviceCents: 0,
      productCents: 0,
      totalCents: 0,
      adjustmentCents: 0,
      ...defaultBillFields(),
      visitCount,
      isMember: Boolean(appt.client.memberAt),
      loyaltyPointsBalance: appt.client.loyaltyPoints,
      redeemPointsEnabled: false,
      clientFirstName: firstName(appt.client.name),
      stylistName: appt.stylist.name,
      stylistPhotoUrl: stylistPhotoUrl({
        id: appt.stylist.id,
        gender: appt.stylist.gender,
        photoUpdatedAt: appt.stylist.photoUpdatedAt,
        hasPhoto: Boolean(appt.stylist.photoMime && appt.stylist.photoUpdatedAt),
      }),
      salonName: salon.name,
      visitTime: formatClock(appt.startsAt.toISOString(), tz),
      services,
      products: [],
      presentedAt: new Date().toISOString(),
    },
    tipMode,
    promo
  );
}

export async function visitAppointmentIds(salonId: string, appointmentId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, salonId },
    select: { id: true, bookingGroupId: true, clientId: true },
  });
  if (!appt) return [] as string[];
  if (!appt.bookingGroupId) return [appt.id];
  const rows = await prisma.appointment.findMany({
    where: {
      salonId,
      bookingGroupId: appt.bookingGroupId,
      status: { in: ["BOOKED", "CHECKED_IN"] },
    },
    select: { id: true },
    orderBy: { startsAt: "asc" },
  });
  return rows.map((r) => r.id);
}

export async function checkoutClientId(salonId: string, appointmentId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, salonId },
    select: { clientId: true },
  });
  return appt?.clientId || null;
}
