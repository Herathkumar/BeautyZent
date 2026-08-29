import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlatformSession } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  action: z.enum(["PUBLISHED", "REJECTED", "pause", "resume"]),
  reason: z.string().max(800).optional(),
});

/** Approve / reject marketplace claims, or pause / resume a published listing. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({ where: { id }, select: { id: true } });
  if (!salon) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const { action } = parsed.data;
  const reason = parsed.data.reason?.trim() || "";

  if (action === "PUBLISHED") {
    await prisma.salon.update({
      where: { id },
      data: {
        listingStatus: "PUBLISHED",
        active: true,
        approvedAt: new Date(),
        approvedById: session.adminId,
        listingReviewNote: null,
        listingReviewedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, message: "Business published." });
  }

  if (action === "REJECTED") {
    if (reason.length < 8) {
      return NextResponse.json(
        { error: "Add a short reason so the business knows what to fix." },
        { status: 400 }
      );
    }
    await prisma.salon.update({
      where: { id },
      data: {
        listingStatus: "REJECTED",
        active: false,
        listingReviewNote: reason,
        listingReviewedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true, message: "Claim rejected." });
  }

  if (action === "pause") {
    await prisma.salon.update({
      where: { id },
      data: { active: false },
    });
    return NextResponse.json({ ok: true, message: "Business paused." });
  }

  await prisma.salon.update({
    where: { id },
    data: { active: true, listingStatus: "PUBLISHED" },
  });
  return NextResponse.json({ ok: true, message: "Business resumed." });
}
