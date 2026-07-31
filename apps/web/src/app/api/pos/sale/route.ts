import { posSaleSchema } from "@zentralab/shared";
import { AuthError, requireAuth } from "@/lib/auth";
import { createPosSale } from "@/lib/inventory";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth(req, ["owner", "cashier", "staff"]);
    const body = posSaleSchema.parse(await req.json());
    if (body.storeId !== user.storeId) {
      return jsonWithCors(req, { error: "Store mismatch" }, { status: 403 });
    }
    const result = await createPosSale(body);
    return jsonWithCors(req, result);
  } catch (e) {
    const status = e instanceof AuthError ? e.status : 400;
    return jsonWithCors(
      req,
      { error: e instanceof Error ? e.message : "Error" },
      { status }
    );
  }
}
