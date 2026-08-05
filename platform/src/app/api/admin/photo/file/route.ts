import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { photoData: true, photoMime: true },
  });

  if (!user?.photoData?.length) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = Buffer.from(user.photoData);
  return new NextResponse(body, {
    headers: {
      "Content-Type": user.photoMime || "image/jpeg",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
