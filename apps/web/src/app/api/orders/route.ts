import { AuthError, requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function GET(req: Request) {
  try {
    const user = await requireAuth(req);
    const url = new URL(req.url);
    const channel = url.searchParams.get("channel");
    const status = url.searchParams.get("status");
    const orders = await prisma.order.findMany({
      where: {
        storeId: user.storeId,
        ...(channel ? { channel } : {}),
        ...(status ? { status } : {}),
      },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return jsonWithCors(req, { orders });
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 500;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status }
    );
  }
}
