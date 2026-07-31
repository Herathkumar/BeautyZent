import { orderStatusLookupSchema } from "@zentralab/shared";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function POST(req: Request) {
  try {
    const body = orderStatusLookupSchema.parse(await req.json());
    const order = await prisma.order.findFirst({
      where: {
        id: body.orderId,
        customerEmail: body.email,
        channel: "online",
      },
      include: { lines: true, store: true },
    });
    if (!order) {
      return jsonWithCors(req, { error: "Order not found" }, { status: 404 });
    }
    return jsonWithCors(req, {
      order: {
        id: order.id,
        status: order.status,
        totalCents: order.totalCents,
        taxCents: order.taxCents,
        subtotalCents: order.subtotalCents,
        customerName: order.customerName,
        lines: order.lines,
        storeName: order.store.name,
        createdAt: order.createdAt,
      },
    });
  } catch (e) {
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status: 400 }
    );
  }
}
