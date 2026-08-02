import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAvailableSlots } from "@/lib/slots";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const stylistId = url.searchParams.get("stylistId");
  const serviceId = url.searchParams.get("serviceId");
  const date = url.searchParams.get("date");
  if (!stylistId || !serviceId || !date) {
    return NextResponse.json({ error: "stylistId, serviceId, date required" }, { status: 400 });
  }

  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  const slots = await getAvailableSlots({
    salonId: salon.id,
    stylistId,
    serviceId,
    day: new Date(`${date}T12:00:00`),
  });

  return NextResponse.json({ slots });
}
