import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Manager re-requests marketplace approval after fixing rejected details. */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role === "FRONT_DESK") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }

  let body: { action?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  if (body.action !== "RESUBMIT") {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({
    where: { id: session.salonId },
    select: { id: true, listingStatus: true },
  });
  if (!salon) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  if (salon.listingStatus !== "REJECTED") {
    return NextResponse.json(
      { error: "Only a rejected listing can request approval again." },
      { status: 400 }
    );
  }

  const updated = await prisma.salon.update({
    where: { id: salon.id },
    data: {
      listingStatus: "DRAFT",
      active: false,
    },
    select: {
      id: true,
      listingStatus: true,
      listingReviewNote: true,
    },
  });

  return NextResponse.json({
    salon: updated,
    message: "Sent back for platform review.",
  });
}
