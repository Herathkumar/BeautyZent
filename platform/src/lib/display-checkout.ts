import { firstName, formatClock } from "@/lib/display-schedule";
import { prisma } from "@/lib/prisma";
import { stylistPhotoUrl } from "@/lib/stylist-photo";
import type {
  CheckoutBill,
  CheckoutLine,
  CheckoutTipMode,
} from "@/lib/display-checkout-types";

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

export function tipCentsFor(chargedCents: number, mode: CheckoutTipMode) {
  if (mode.kind === "none") return 0;
  if (mode.kind === "percent") return Math.round((chargedCents * mode.pct) / 100);
  return Math.max(0, Math.round(mode.cents));
}

export function settleBill(
  bill: CheckoutBill,
  tipMode = bill.tipMode || { kind: "none" as const }
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
  const chargedCents = serviceCents + productCents;
  const catalogCents = services.filter((s) => !s.added).reduce((sum, s) => sum + s.priceCents, 0);
  const tipCents = tipCentsFor(chargedCents, tipMode);
  return {
    ...bill,
    services,
    products,
    tipMode,
    catalogCents,
    serviceCents,
    productCents,
    chargedCents,
    tipCents,
    adjustmentCents: 0,
    totalCents: chargedCents + tipCents,
  };
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
  const bill = settleBill({ ...row.bill, status: row.status }, row.bill.tipMode || { kind: "none" });
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
  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: { name: true, timezone: true },
  });
  if (!salon) return null;

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, salonId },
    select: {
      id: true,
      status: true,
      startsAt: true,
      bookingGroupId: true,
      client: { select: { name: true } },
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

  return settleBill({
    appointmentId: appt.id,
    status,
    chargedCents,
    tipCents,
    tipMode,
    catalogCents: 0,
    serviceCents: 0,
    productCents: 0,
    totalCents: 0,
    adjustmentCents: 0,
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
  });
}

export async function visitAppointmentIds(salonId: string, appointmentId: string) {
  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, salonId },
    select: { id: true, bookingGroupId: true },
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
