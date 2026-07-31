import { prisma } from "./prisma";
import { available } from "./inventory";
import { formatMoney } from "@zentralab/shared";

export type AiRole = "customer" | "staff";

export interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  requiresConfirmation?: boolean;
  draftAction?: { tool: string; args: Record<string, unknown> };
}

export const customerTools = [
  {
    type: "function" as const,
    function: {
      name: "search_products",
      description: "Search products by name or SKU",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "check_stock",
      description: "Check if a product is in stock by SKU or barcode",
      parameters: {
        type: "object",
        properties: {
          skuOrBarcode: { type: "string" },
        },
        required: ["skuOrBarcode"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "order_status",
      description: "Look up online order status by order id and email",
      parameters: {
        type: "object",
        properties: {
          orderId: { type: "string" },
          email: { type: "string" },
        },
        required: ["orderId", "email"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "store_info",
      description: "Get store hours and policies",
      parameters: { type: "object", properties: {} },
    },
  },
];

export const staffTools = [
  ...customerTools.filter((t) => t.function.name !== "order_status"),
  {
    type: "function" as const,
    function: {
      name: "low_stock",
      description: "List products at or below reorder point",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "todays_sales",
      description: "Summarize today's completed sales",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "draft_stock_adjust",
      description:
        "Draft a stock receive or adjust. Requires user confirmation before applying.",
      parameters: {
        type: "object",
        properties: {
          sku: { type: "string" },
          delta: { type: "integer" },
          type: { type: "string", enum: ["receive", "adjust"] },
          reason: { type: "string" },
        },
        required: ["sku", "delta", "type", "reason"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "order_status_staff",
      description: "Look up any order by id",
      parameters: {
        type: "object",
        properties: { orderId: { type: "string" } },
        required: ["orderId"],
      },
    },
  },
];

export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: { storeId: string; role: AiRole; confirmed?: boolean }
): Promise<ToolResult> {
  switch (name) {
    case "search_products": {
      const query = String(args.query ?? "");
      const products = await prisma.product.findMany({
        where: {
          storeId: ctx.storeId,
          active: true,
          OR: [
            { name: { contains: query } },
            { sku: { contains: query } },
            { barcode: { contains: query } },
          ],
        },
        include: { inventory: true },
        take: 8,
      });
      return {
        ok: true,
        data: products.map((p) => ({
          sku: p.sku,
          name: p.name,
          price: formatMoney(p.priceCents),
          available: p.inventory
            ? available(p.inventory.onHand, p.inventory.reserved)
            : 0,
        })),
      };
    }
    case "check_stock": {
      const key = String(args.skuOrBarcode ?? "");
      const product = await prisma.product.findFirst({
        where: {
          storeId: ctx.storeId,
          OR: [{ sku: key }, { barcode: key }],
        },
        include: { inventory: true },
      });
      if (!product?.inventory) return { ok: false, error: "Product not found" };
      const avail = available(product.inventory.onHand, product.inventory.reserved);
      return {
        ok: true,
        data: {
          sku: product.sku,
          name: product.name,
          onHand: product.inventory.onHand,
          reserved: product.inventory.reserved,
          available: avail,
          inStock: avail > 0,
        },
      };
    }
    case "order_status": {
      const order = await prisma.order.findFirst({
        where: {
          id: String(args.orderId),
          customerEmail: String(args.email),
          storeId: ctx.storeId,
        },
        include: { lines: true },
      });
      if (!order) return { ok: false, error: "Order not found" };
      return {
        ok: true,
        data: {
          id: order.id,
          status: order.status,
          total: formatMoney(order.totalCents),
          lines: order.lines.map((l) => `${l.qty}x ${l.name}`),
        },
      };
    }
    case "order_status_staff": {
      const order = await prisma.order.findFirst({
        where: { id: String(args.orderId), storeId: ctx.storeId },
        include: { lines: true },
      });
      if (!order) return { ok: false, error: "Order not found" };
      return {
        ok: true,
        data: {
          id: order.id,
          channel: order.channel,
          status: order.status,
          total: formatMoney(order.totalCents),
          customer: order.customerName,
          lines: order.lines.map((l) => `${l.qty}x ${l.name}`),
        },
      };
    }
    case "store_info": {
      const store = await prisma.store.findUnique({ where: { id: ctx.storeId } });
      if (!store) return { ok: false, error: "Store not found" };
      return {
        ok: true,
        data: {
          name: store.name,
          hours: JSON.parse(store.hoursJson),
          policies: store.policies,
        },
      };
    }
    case "low_stock": {
      if (ctx.role !== "staff") return { ok: false, error: "Staff only" };
      const rows = await prisma.inventory.findMany({
        where: { storeId: ctx.storeId },
        include: { product: true },
      });
      const low = rows
        .filter((r) => r.onHand - r.reserved <= r.reorderPoint)
        .map((r) => ({
          sku: r.product.sku,
          name: r.product.name,
          available: r.onHand - r.reserved,
          reorderPoint: r.reorderPoint,
        }));
      return { ok: true, data: low };
    }
    case "todays_sales": {
      if (ctx.role !== "staff") return { ok: false, error: "Staff only" };
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const orders = await prisma.order.findMany({
        where: {
          storeId: ctx.storeId,
          createdAt: { gte: start },
          status: { in: ["completed", "paid", "fulfilled", "reserved"] },
        },
      });
      const total = orders.reduce((s, o) => s + o.totalCents, 0);
      return {
        ok: true,
        data: {
          orderCount: orders.length,
          total: formatMoney(total),
          byChannel: {
            pos: orders.filter((o) => o.channel === "pos").length,
            online: orders.filter((o) => o.channel === "online").length,
          },
        },
      };
    }
    case "draft_stock_adjust": {
      if (ctx.role !== "staff") return { ok: false, error: "Staff only" };
      const sku = String(args.sku);
      const product = await prisma.product.findFirst({
        where: { storeId: ctx.storeId, sku },
        include: { inventory: true },
      });
      if (!product?.inventory) return { ok: false, error: "Product not found" };

      if (!ctx.confirmed) {
        return {
          ok: true,
          requiresConfirmation: true,
          draftAction: {
            tool: "draft_stock_adjust",
            args: {
              sku,
              productId: product.id,
              delta: Number(args.delta),
              type: args.type,
              reason: args.reason,
            },
          },
          data: {
            message: `Confirm ${args.type} of ${args.delta} units for ${product.name} (${sku})? Current on hand: ${product.inventory.onHand}`,
          },
        };
      }

      const delta = Number(args.delta);
      const updated = await prisma.inventory.update({
        where: { id: product.inventory.id },
        data: {
          onHand: { increment: delta },
          version: { increment: 1 },
        },
      });
      await prisma.stockMovement.create({
        data: {
          storeId: ctx.storeId,
          productId: product.id,
          type: String(args.type),
          qty: delta,
          reason: String(args.reason ?? "AI-assisted adjust"),
        },
      });
      return {
        ok: true,
        data: { sku, onHand: updated.onHand },
      };
    }
    default:
      return { ok: false, error: `Unknown tool: ${name}` };
  }
}

export async function mockAssistantReply(
  role: AiRole,
  storeId: string,
  userText: string
): Promise<{ content: string; draftAction?: ToolResult["draftAction"] }> {
  const text = userText.toLowerCase();

  if (text.includes("hours") || text.includes("policy") || text.includes("return")) {
    const r = await runTool("store_info", {}, { storeId, role });
    return { content: `Store info: ${JSON.stringify(r.data, null, 2)}` };
  }

  if (text.includes("low stock") || text.includes("reorder")) {
    if (role !== "staff") {
      return { content: "I can help you find products. Ask about a SKU or product name." };
    }
    const r = await runTool("low_stock", {}, { storeId, role });
    return { content: `Low stock items: ${JSON.stringify(r.data, null, 2)}` };
  }

  if (text.includes("today") && (text.includes("sale") || text.includes("sales"))) {
    if (role !== "staff") {
      return { content: "Sales summaries are available to staff only." };
    }
    const r = await runTool("todays_sales", {}, { storeId, role });
    return { content: `Today's sales: ${JSON.stringify(r.data, null, 2)}` };
  }

  const skuMatch = userText.match(/\b([A-Z0-9-]{4,})\b/);
  if (text.includes("stock") || text.includes("how many") || skuMatch) {
    const key = skuMatch?.[1] ?? userText.replace(/[^a-zA-Z0-9-]/g, " ").trim();
    const r = await runTool("check_stock", { skuOrBarcode: key }, { storeId, role });
    if (r.ok) return { content: `Stock: ${JSON.stringify(r.data, null, 2)}` };
    const search = await runTool("search_products", { query: key }, { storeId, role });
    return { content: `Search results: ${JSON.stringify(search.data, null, 2)}` };
  }

  if (text.includes("receive") || text.includes("adjust")) {
    if (role !== "staff") {
      return { content: "Stock adjustments are staff-only." };
    }
    const sku = skuMatch?.[1] ?? "USB-C-HUB";
    const r = await runTool(
      "draft_stock_adjust",
      { sku, delta: 5, type: "receive", reason: "AI draft receive" },
      { storeId, role, confirmed: false }
    );
    return {
      content: String((r.data as { message?: string })?.message ?? "Draft ready"),
      draftAction: r.draftAction,
    };
  }

  const search = await runTool(
    "search_products",
    { query: userText.slice(0, 40) },
    { storeId, role }
  );
  return {
    content:
      role === "staff"
        ? `I can check stock, low-stock, today's sales, or draft receives. Try: "how many USB-C-HUB left?"\n${JSON.stringify(search.data, null, 2)}`
        : `I can search products, check stock, order status, and store hours. Try: "is MSE-WL in stock?"\n${JSON.stringify(search.data, null, 2)}`,
  };
}
