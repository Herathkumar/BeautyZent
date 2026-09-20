import { NextResponse } from "next/server";
import { getPlatformSession } from "@/lib/platform-auth";

export async function GET() {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ admin: null });
  return NextResponse.json({ admin: { email: session.email, name: session.name } });
}
