import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }
  const user = await login(email, password);
  if (!user) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  let stylistId = user.stylistId;
  if (stylistId) {
    const active = await prisma.stylist.findFirst({
      where: { id: stylistId, active: true },
      select: { id: true },
    });
    if (!active) stylistId = null;
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      stylistId,
    },
  });
}
