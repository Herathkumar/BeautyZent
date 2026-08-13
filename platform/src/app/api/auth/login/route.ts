import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email, password, salonSlug } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  let salonId: string | undefined;
  let requestedName = "";
  if (typeof salonSlug === "string" && salonSlug.trim()) {
    const requested = await prisma.salon.findUnique({
      where: { slug: salonSlug.trim().toLowerCase() },
      select: { id: true, name: true },
    });
    if (!requested) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }
    salonId = requested.id;
    requestedName = requested.name;
  }

  const result = await login(email, password, salonId ? { salonId } : undefined);
  if (!result.ok) {
    if (result.reason === "wrong_salon") {
      return NextResponse.json(
        {
          error: requestedName
            ? `That login is not for ${requestedName}. Use an account from this salon.`
            : "That login belongs to a different salon.",
        },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const user = result.user;
  let stylistId = user.stylistId;
  if (stylistId) {
    const active = await prisma.stylist.findFirst({
      where: { id: stylistId, active: true },
      select: { id: true },
    });
    if (!active) stylistId = null;
  }

  const salon = await prisma.salon.findUnique({
    where: { id: user.salonId },
    select: {
      name: true,
      slug: true,
      address: true,
      brandColor: true,
      accentColor: true,
      bookingThemeId: true,
      managerThemeId: true,
      stylistThemeId: true,
    },
  });

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      stylistId,
    },
    salon,
  });
}
