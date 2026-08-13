import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function salonHintFromRequest(
  req: Request,
  body: { salonSlug?: unknown; salonId?: unknown }
) {
  const url = new URL(req.url);
  let refererSlug = "";
  try {
    const referer = req.headers.get("referer");
    if (referer) refererSlug = new URL(referer).searchParams.get("salon") || "";
  } catch {
    /* ignore */
  }
  const salonId = typeof body.salonId === "string" ? body.salonId.trim() : "";
  const salonSlug = (
    (typeof body.salonSlug === "string" && body.salonSlug) ||
    url.searchParams.get("salon") ||
    refererSlug ||
    ""
  )
    .trim()
    .toLowerCase();
  return { salonId, salonSlug };
}

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const hint = salonHintFromRequest(req, body);
  let salonId: string | undefined;
  let requestedName = "";

  if (hint.salonId) {
    const requested = await prisma.salon.findUnique({
      where: { id: hint.salonId },
      select: { id: true, name: true, slug: true },
    });
    if (!requested) {
      return NextResponse.json({ error: "Salon not found" }, { status: 404 });
    }
    salonId = requested.id;
    requestedName = requested.name;
  } else if (hint.salonSlug) {
    const requested = await prisma.salon.findUnique({
      where: { slug: hint.salonSlug },
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
    if (result.reason === "ambiguous") {
      return NextResponse.json(
        {
          error: "That email is used at more than one salon. Open the stylist app from that salon in the operator console.",
        },
        { status: 409 }
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
