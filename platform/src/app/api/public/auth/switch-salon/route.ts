import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  getClientSession,
  issueClientSession,
  normalizeEmail,
} from "@/lib/client-auth";
import { clientPhotoUrl } from "@/lib/client-photo";

const bodySchema = z.object({
  slug: z.string().min(1),
});

/**
 * Switch the shared client cookie to another salon membership for the same email.
 */
export async function POST(req: Request) {
  const session = await getClientSession();
  if (!session?.email) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a business." }, { status: 400 });
  }

  const salon = await prisma.salon.findFirst({
    where: { slug: parsed.data.slug, active: true },
  });
  if (!salon) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  const email = normalizeEmail(session.email);
  const client = await prisma.client.findFirst({
    where: {
      salonId: salon.id,
      email,
      memberAt: { not: null },
    },
  });
  if (!client?.email) {
    return NextResponse.json(
      { error: "You’re not a member at that business yet. Join from their booking page." },
      { status: 404 }
    );
  }

  await issueClientSession(client);

  return NextResponse.json({
    ok: true,
    salon: { id: salon.id, name: salon.name, slug: salon.slug },
    client: {
      id: client.id,
      name: client.name,
      phone: client.phone,
      email: client.email,
      preferredStylistId: client.preferredStylistId,
      photoUrl: clientPhotoUrl(salon.slug, client),
    },
  });
}
