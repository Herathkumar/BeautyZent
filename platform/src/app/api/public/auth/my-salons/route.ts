import { NextResponse } from "next/server";
import {
  getClientSession,
  listClientMembershipsByEmail,
} from "@/lib/client-auth";

/** Lists every active salon membership for the signed-in client's email. */
export async function GET() {
  const session = await getClientSession();
  if (!session?.email) {
    return NextResponse.json({ salons: [] });
  }

  const salons = await listClientMembershipsByEmail(session.email);
  return NextResponse.json({
    salons,
    currentSalonId: session.salonId,
    email: session.email,
  });
}
