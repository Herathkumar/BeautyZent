import { syncPushSchema } from "@zentralab/shared";
import { AuthError, requireAuth } from "@/lib/auth";
import { createPosSale, nextServerVersion } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req, ["owner", "cashier", "staff"]);
    const body = syncPushSchema.parse(await req.json());
    if (body.storeId !== user.storeId) {
      return jsonWithCors(req, { error: "Store mismatch" }, { status: 403 });
    }

    const accepted: string[] = [];
    const conflicts: Array<{
      eventId: string;
      entityId: string;
      message: string;
      onHand?: number;
    }> = [];

    for (const event of body.events) {
      await prisma.syncEvent.create({
        data: {
          storeId: body.storeId,
          deviceId: body.deviceId,
          entityType: event.entityType,
          entityId: event.entityId,
          op: event.op,
          version: event.version,
          payload: JSON.stringify(event.payload),
          createdAt: new Date(event.createdAt),
        },
      });

      if (event.entityType === "order" && event.payload.kind === "pos_sale") {
        const payload = event.payload as {
          clientOrderId: string;
          lines: Array<{ productId: string; qty: number; unitPriceCents?: number }>;
          tenderType: "cash" | "card_external";
          amountTenderedCents?: number;
        };
        const result = await createPosSale({
          storeId: body.storeId,
          deviceId: body.deviceId,
          clientOrderId: payload.clientOrderId,
          lines: payload.lines,
          tenderType: payload.tenderType,
          amountTenderedCents: payload.amountTenderedCents,
          offlineCreatedAt: event.createdAt,
        });
        accepted.push(event.id);
        for (const msg of result.conflicts) {
          conflicts.push({
            eventId: event.id,
            entityId: event.entityId,
            message: msg,
          });
        }
      } else {
        accepted.push(event.id);
      }
    }

    const serverVersion = await nextServerVersion();
    return jsonWithCors(req, { accepted, conflicts, serverVersion });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 400;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status }
    );
  }
}
