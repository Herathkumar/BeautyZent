import { authenticateRequest } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function GET(req: Request) {
  const session = await authenticateRequest(req);
  if (!session) {
    return jsonWithCors(req, { error: "Unauthorized" }, { status: 401 });
  }
  const store = await prisma.store.findUnique({ where: { id: session.storeId } });
  return jsonWithCors(req, { user: session, store });
}
