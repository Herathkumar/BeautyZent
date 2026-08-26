import { NextResponse } from "next/server";
import { updateAppointmentStatus } from "@/lib/complete-appointment";
import {
  buildCheckoutBill,
  clearCheckout,
  getCheckoutRow,
  loadCheckoutBill,
  settleBill,
  upsertCheckout,
  visitAppointmentIds,
} from "@/lib/display-checkout";
import type { CheckoutTipMode } from "@/lib/display-checkout-types";
import { assertDisplayAccess } from "@/lib/display-pin";
import { prisma } from "@/lib/prisma";
import { syncAppointmentToGoogle } from "@/lib/calendar";

async function salonFor(slug: string) {
  return prisma.salon.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      timezone: true,
      displayPinHash: true,
      displayPinSetAt: true,
    },
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await salonFor(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

  const checkout = await loadCheckoutBill(salon.id);
  return NextResponse.json({ checkout });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await salonFor(slug);
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });
  const locked = await assertDisplayAccess(salon, req);
  if (locked) return locked;

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");

  if (action === "present") {
    try {
      const appointmentId = String(body.appointmentId || "");
      const appt = await prisma.appointment.findFirst({
        where: { id: appointmentId, salonId: salon.id },
        select: {
          id: true,
          status: true,
          bookingGroupId: true,
          service: { select: { priceCents: true } },
        },
      });
      if (!appt) return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (!["BOOKED", "CHECKED_IN"].includes(appt.status)) {
        return NextResponse.json({ error: "Visit is not open" }, { status: 400 });
      }

      const siblings = appt.bookingGroupId
        ? await prisma.appointment.findMany({
            where: {
              salonId: salon.id,
              bookingGroupId: appt.bookingGroupId,
              status: { in: ["BOOKED", "CHECKED_IN"] },
            },
            select: { service: { select: { priceCents: true } } },
          })
        : [appt];
      const catalogCents = siblings.reduce((sum, s) => sum + (s.service?.priceCents || 0), 0);
      const chargedCents =
        Number.isFinite(body.chargedCents) && body.chargedCents >= 0
          ? Math.round(body.chargedCents)
          : catalogCents;
      const tipCents =
        Number.isFinite(body.tipCents) && body.tipCents >= 0 ? Math.round(body.tipCents) : 0;

      const bill = await buildCheckoutBill(
        salon.id,
        appt.id,
        chargedCents,
        tipCents,
        "PENDING",
        salon.timezone
      );
      if (!bill) return NextResponse.json({ error: "Could not build bill" }, { status: 400 });

      const now = new Date();
      upsertCheckout({
        salonId: salon.id,
        appointmentId: appt.id,
        chargedCents,
        tipCents,
        status: "PENDING",
        presentedAt: now,
        updatedAt: now,
        bill: { ...bill, presentedAt: now.toISOString() },
      });

      return NextResponse.json({
        checkout: await loadCheckoutBill(salon.id),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not open checkout";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  const current = getCheckoutRow(salon.id);
  if (!current) {
    return NextResponse.json({ checkout: null });
  }

  if (action === "update" || action === "tip") {
    if (body.tipMode && typeof body.tipMode === "object") {
      const raw = body.tipMode as CheckoutTipMode;
      if (raw.kind === "none") current.bill.tipMode = { kind: "none" };
      else if (raw.kind === "percent" && Number.isFinite(raw.pct)) {
        current.bill.tipMode = { kind: "percent", pct: Math.round(raw.pct) };
      } else if (raw.kind === "custom" && Number.isFinite(raw.cents) && raw.cents >= 0) {
        current.bill.tipMode = { kind: "custom", cents: Math.round(raw.cents) };
      }
    } else if (Number.isFinite(body.tipCents) && body.tipCents >= 0) {
      const cents = Math.round(body.tipCents);
      current.bill.tipMode = cents === 0 ? { kind: "none" } : { kind: "custom", cents };
    }
    if (current.status === "VERIFIED") current.status = "PENDING";
    current.bill = settleBill(current.bill);
    current.chargedCents = current.bill.chargedCents;
    current.tipCents = current.bill.tipCents;
    current.updatedAt = new Date();
    upsertCheckout(current);
    return NextResponse.json({
      checkout: await loadCheckoutBill(salon.id),
    });
  }

  if (action === "add-line") {
    const kind = body.kind === "product" ? "product" : "service";
    const catalogId = String(body.catalogId || "");
    if (!catalogId) return NextResponse.json({ error: "catalogId required" }, { status: 400 });
    if (kind === "service") {
      const svc = await prisma.service.findFirst({
        where: { id: catalogId, salonId: salon.id, active: true },
        select: { id: true, name: true, durationMin: true, priceCents: true },
      });
      if (!svc) return NextResponse.json({ error: "Service not found" }, { status: 404 });
      current.bill.services = [
        ...(current.bill.services || []),
        {
          id: `extra-svc-${svc.id}-${Date.now()}`,
          catalogId: svc.id,
          kind: "service",
          name: svc.name,
          durationMin: svc.durationMin,
          priceCents: svc.priceCents,
          added: true,
        },
      ];
    } else {
      const product = await prisma.product.findFirst({
        where: { id: catalogId, salonId: salon.id, active: true },
        select: { id: true, name: true, priceCents: true },
      });
      if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
      current.bill.products = [
        ...(current.bill.products || []),
        {
          id: `extra-prd-${product.id}-${Date.now()}`,
          catalogId: product.id,
          kind: "product",
          name: product.name,
          priceCents: product.priceCents,
          added: true,
        },
      ];
    }
    if (current.status === "VERIFIED") current.status = "PENDING";
    current.bill = settleBill(current.bill);
    current.chargedCents = current.bill.chargedCents;
    current.tipCents = current.bill.tipCents;
    current.updatedAt = new Date();
    upsertCheckout(current);
    return NextResponse.json({
      checkout: await loadCheckoutBill(salon.id),
    });
  }

  if (action === "remove-line") {
    const lineId = String(body.lineId || "");
    current.bill.services = (current.bill.services || []).filter((l) => l.id !== lineId || !l.added);
    current.bill.products = (current.bill.products || []).filter((l) => l.id !== lineId);
    if (current.status === "VERIFIED") current.status = "PENDING";
    current.bill = settleBill(current.bill);
    current.chargedCents = current.bill.chargedCents;
    current.tipCents = current.bill.tipCents;
    current.updatedAt = new Date();
    upsertCheckout(current);
    return NextResponse.json({
      checkout: await loadCheckoutBill(salon.id),
    });
  }

  if (action === "verify") {
    current.status = "VERIFIED";
    current.updatedAt = new Date();
    upsertCheckout(current);
    return NextResponse.json({
      checkout: await loadCheckoutBill(salon.id),
    });
  }

  if (action === "cancel") {
    await clearCheckout(salon.id);
    return NextResponse.json({ checkout: null });
  }

  if (action === "complete") {
    const ids = await visitAppointmentIds(salon.id, current.appointmentId);
    if (!ids.length) {
      await clearCheckout(salon.id);
      return NextResponse.json({ error: "Visit is not open" }, { status: 400 });
    }
    const charged = current.bill.chargedCents;
    const tip = current.bill.tipCents;

    for (let i = 0; i < ids.length; i++) {
      const result = await updateAppointmentStatus({
        appointmentId: ids[i],
        status: "COMPLETED",
        chargedCents: i === 0 ? charged : 0,
        tipCents: i === 0 ? tip : 0,
        chargedByUserId: null,
      });
      if ("error" in result) {
        return NextResponse.json({ error: result.error }, { status: result.status });
      }
      void syncAppointmentToGoogle(result.appointment.id).catch(() => null);
    }
    current.status = "PAID";
    current.chargedCents = charged;
    current.tipCents = tip;
    current.updatedAt = new Date();
    current.bill = settleBill({ ...current.bill, status: "PAID" });
    current.chargedCents = current.bill.chargedCents;
    current.tipCents = current.bill.tipCents;
    upsertCheckout(current);
    return NextResponse.json({
      checkout: await loadCheckoutBill(salon.id),
      completed: true,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
