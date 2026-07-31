import { loginSchema } from "@zentralab/shared";
import {
  createSessionToken,
  loginWithCredentials,
  setSessionCookie,
} from "@/lib/auth";
import { jsonWithCors, optionsResponse } from "@/lib/cors";

export async function OPTIONS(req: Request) {
  return optionsResponse(req);
}

export async function POST(req: Request) {
  try {
    const body = loginSchema.parse(await req.json());
    const user = await loginWithCredentials(body.email, body.password);
    if (!user) {
      return jsonWithCors(req, { error: "Invalid credentials" }, { status: 401 });
    }
    const token = await createSessionToken(user);
    await setSessionCookie(token);
    return jsonWithCors(req, { user, token });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Login failed";
    return jsonWithCors(req, { error: message }, { status: 400 });
  }
}
