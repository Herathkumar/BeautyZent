import { clearSessionCookie } from "@/lib/auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function POST(req: Request) {
  await clearSessionCookie();
  return jsonWithCors(req, { ok: true });
}
