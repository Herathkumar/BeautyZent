import { NextResponse } from "next/server";
import { platformLogout } from "@/lib/platform-auth";

export async function POST() {
  await platformLogout();
  return NextResponse.json({ ok: true });
}
