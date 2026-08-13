import { NextResponse } from "next/server";
import { platformLogin } from "@/lib/platform-auth";

export async function POST(req: Request) {
  let body: { email?: string; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const session = await platformLogin(body.email, body.password);
  if (!session) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  return NextResponse.json({ admin: { email: session.email, name: session.name } });
}
