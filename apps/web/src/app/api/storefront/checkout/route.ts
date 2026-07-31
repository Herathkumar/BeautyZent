import { onlineCheckoutSchema } from "@zentralab/shared";
import { createOnlineReservation } from "@/lib/online-order";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";
import Stripe from "stripe";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function POST(req: Request) {
  try {
    const body = onlineCheckoutSchema.parse(await req.json());
    const { store, order } = await createOnlineReservation(body);

    const storefrontUrl =
      process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3002";
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (stripeKey) {
      const stripe = new Stripe(stripeKey);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: body.customerEmail,
        success_url: `${storefrontUrl}/order/${order.id}?paid=1&email=${encodeURIComponent(body.customerEmail)}`,
        cancel_url: `${storefrontUrl}/checkout?cancelled=1`,
        line_items: order.lines.map((l) => ({
          quantity: l.qty,
          price_data: {
            currency: store.currency.toLowerCase(),
            unit_amount: l.unitPriceCents,
            product_data: { name: l.name },
          },
        })),
        metadata: { orderId: order.id, storeId: store.id },
      });
      await prisma.order.update({
        where: { id: order.id },
        data: {
          stripeSessionId: session.id,
          status: "pending_payment",
        },
      });
      return jsonWithCors(req, {
        orderId: order.id,
        checkoutUrl: session.url,
        mode: "stripe",
      });
    }

    // Demo mode: mark paid immediately
    const paid = await prisma.order.update({
      where: { id: order.id },
      data: { status: "paid", tenderType: "stripe" },
      include: { lines: true },
    });

    return jsonWithCors(req, {
      orderId: paid.id,
      checkoutUrl: `${storefrontUrl}/order/${paid.id}?paid=1&email=${encodeURIComponent(body.customerEmail)}`,
      mode: "demo",
      order: paid,
    });
  } catch (e) {
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Checkout failed" },
      { status: 400 }
    );
  }
}
