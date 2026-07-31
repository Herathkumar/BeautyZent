import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export const productInputSchema = z.object({
  sku: z.string().min(1).max(64),
  barcode: z.string().min(1).max(64).optional().nullable(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  priceCents: z.number().int().nonnegative(),
  taxBps: z.number().int().min(0).max(10000).default(1300),
  active: z.boolean().default(true),
  reorderPoint: z.number().int().nonnegative().default(5),
  onHand: z.number().int().optional(),
});

export const stockAdjustSchema = z.object({
  productId: z.string().min(1),
  delta: z.number().int(),
  reason: z.string().min(1).max(200),
  type: z.enum(["receive", "adjust"]),
});

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative().optional(),
});

export const posSaleSchema = z.object({
  storeId: z.string().min(1),
  deviceId: z.string().min(1),
  clientOrderId: z.string().min(1),
  lines: z.array(cartLineSchema).min(1),
  tenderType: z.enum(["cash", "card_external"]),
  amountTenderedCents: z.number().int().nonnegative().optional(),
  offlineCreatedAt: z.string().datetime().optional(),
  version: z.number().int().optional(),
});

export const syncPushSchema = z.object({
  deviceId: z.string().min(1),
  storeId: z.string().min(1),
  events: z.array(
    z.object({
      id: z.string().min(1),
      entityType: z.enum(["product", "inventory", "order", "stock_movement"]),
      entityId: z.string().min(1),
      op: z.enum(["create", "update"]),
      version: z.number().int(),
      payload: z.record(z.unknown()),
      createdAt: z.string().datetime(),
    })
  ),
});

export const syncPullSchema = z.object({
  storeId: z.string().min(1),
  sinceVersion: z.number().int().nonnegative().default(0),
});

export const onlineCheckoutSchema = z.object({
  storeSlug: z.string().min(1),
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email(),
  lines: z.array(cartLineSchema).min(1),
});

export const orderStatusLookupSchema = z.object({
  orderId: z.string().min(1),
  email: z.string().email(),
});

export const aiChatSchema = z.object({
  role: z.enum(["customer", "staff"]),
  storeId: z.string().optional(),
  storeSlug: z.string().optional(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
    })
  ),
  pendingAction: z
    .object({
      tool: z.string(),
      args: z.record(z.unknown()),
      confirmed: z.boolean(),
    })
    .optional(),
});

export const resolveConflictSchema = z.object({
  conflictId: z.string().min(1),
  resolution: z.string().min(1),
  adjustOnHandTo: z.number().int().optional(),
});
