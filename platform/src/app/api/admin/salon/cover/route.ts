import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_COVER_BYTES = 900_000;

async function managerSession() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role) || session.role === "FRONT_DESK") {
    return null;
  }
  return session;
}

/** Manager-owned Explore cover upload. */
export async function PUT(req: Request) {
  const session = await managerSession();
  if (!session) return NextResponse.json({ error: "Manager access required" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.imageBase64) {
    return NextResponse.json({ error: "Cover image required" }, { status: 400 });
  }

  const raw = String(body.imageBase64).replace(/^data:[^;]+;base64,/, "");
  const decoded = Buffer.from(raw, "base64");
  if (!decoded.length) {
    return NextResponse.json({ error: "Image could not be read" }, { status: 400 });
  }
  if (decoded.length > MAX_COVER_BYTES) {
    return NextResponse.json(
      { error: "Image is too large. Try a smaller photo." },
      { status: 400 }
    );
  }

  const mime = String(body.mimeType || "image/jpeg").toLowerCase();
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "Image required" }, { status: 400 });
  }

  const bytes = new Uint8Array(decoded.byteLength);
  bytes.set(decoded);
  const updated = await prisma.salon.update({
    where: { id: session.salonId },
    data: {
      coverData: bytes,
      coverMime: mime === "image/png" ? "image/png" : "image/jpeg",
      coverUpdatedAt: new Date(),
    },
    select: { id: true, coverUpdatedAt: true },
  });

  return NextResponse.json({
    coverUrl: `/api/public/cover/${updated.id}?t=${updated.coverUpdatedAt?.getTime() ?? Date.now()}`,
    message: "Explore cover saved.",
  });
}

export async function DELETE() {
  const session = await managerSession();
  if (!session) return NextResponse.json({ error: "Manager access required" }, { status: 403 });

  await prisma.salon.update({
    where: { id: session.salonId },
    data: { coverData: null, coverMime: null, coverUpdatedAt: null },
  });
  return NextResponse.json({ coverUrl: null, message: "Explore cover removed." });
}
