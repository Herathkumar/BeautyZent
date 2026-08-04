import { NextResponse } from "next/server";
import { canManageStylist } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function parseRange(body: { startsAt?: string; endsAt?: string }) {
  const startsAt = new Date(body.startsAt || "");
  const endsAt = new Date(body.endsAt || "");
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return { error: "Invalid date/time. Use the date and time pickers." as const };
  }
  if (!(startsAt < endsAt)) {
    return { error: "End time must be after start time." as const };
  }
  return { startsAt, endsAt };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await canManageStylist(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const range = parseRange(body);
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });

  const stylist = await prisma.stylist.findUnique({ where: { id } });
  if (!stylist) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isStaff = session.role === "ADMIN" || session.role === "FRONT_DESK";
  const status =
    isStaff || stylist.selfManageSchedule ? "APPROVED" : "PENDING";

  const block = await prisma.stylistBlock.create({
    data: {
      stylistId: id,
      startsAt: range.startsAt,
      endsAt: range.endsAt,
      reason: body.reason || "LEAVE",
      note: body.note || null,
      status,
      reviewedAt: status === "APPROVED" ? new Date() : null,
      reviewedById: status === "APPROVED" ? session.userId : null,
    },
  });

  return NextResponse.json({ block });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await canManageStylist(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Block id required" }, { status: 400 });

  const existing = await prisma.stylistBlock.findFirst({
    where: { id: body.id, stylistId: id },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const isStaff = session.role === "ADMIN" || session.role === "FRONT_DESK";

  // Admin approve / reject pending leave
  if (body.action === "approve" || body.action === "reject") {
    if (!isStaff) {
      return NextResponse.json({ error: "Only admin can review leave" }, { status: 403 });
    }
    const block = await prisma.stylistBlock.update({
      where: { id: existing.id },
      data: {
        status: body.action === "approve" ? "APPROVED" : "REJECTED",
        reviewedAt: new Date(),
        reviewedById: session.userId,
      },
    });
    return NextResponse.json({ block });
  }

  const range = parseRange(body);
  if ("error" in range) return NextResponse.json({ error: range.error }, { status: 400 });

  // Stylist editing a pending/approved block: self-manage stays approved; others go pending again
  let status = existing.status;
  if (!isStaff) {
    const stylist = await prisma.stylist.findUnique({ where: { id } });
    status = stylist?.selfManageSchedule ? "APPROVED" : "PENDING";
  }

  const block = await prisma.stylistBlock.update({
    where: { id: existing.id },
    data: {
      startsAt: range.startsAt,
      endsAt: range.endsAt,
      reason: body.reason || existing.reason,
      note: body.note !== undefined ? body.note || null : existing.note,
      status,
      reviewedAt: status === "APPROVED" && isStaff ? new Date() : existing.reviewedAt,
      reviewedById:
        status === "APPROVED" && isStaff ? session.userId : existing.reviewedById,
    },
  });

  return NextResponse.json({ block });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await canManageStylist(id);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const blockId = url.searchParams.get("blockId");
  if (!blockId) return NextResponse.json({ error: "blockId required" }, { status: 400 });

  const block = await prisma.stylistBlock.findFirst({
    where: { id: blockId, stylistId: id },
  });
  if (!block) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.stylistBlock.delete({ where: { id: blockId } });
  return NextResponse.json({ ok: true });
}
