import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { businessTypeLabel } from "@/lib/marketplace";
import { prisma } from "@/lib/prisma";
import { generateServiceImage, serviceImageAiConfigured } from "@/lib/service-image";

export async function GET() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role) || session.role === "FRONT_DESK") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }
  return NextResponse.json({ configured: serviceImageAiConfigured() });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role) || session.role === "FRONT_DESK") {
    return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  }
  if (!serviceImageAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "Image AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  const prompt = String(body?.prompt || "").trim();
  if (prompt.length < 8 || prompt.length > 400) {
    return NextResponse.json(
      { error: "Describe the cover you want in 8–400 characters." },
      { status: 400 }
    );
  }

  const salon = await prisma.salon.findUnique({
    where: { id: session.salonId },
    select: { name: true, businessType: true, description: true },
  });
  if (!salon) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  const instruction = [
    `Create one photorealistic marketplace cover photo for "${salon.name}", a ${businessTypeLabel(salon.businessType).toLowerCase()}.`,
    `Creative direction: ${prompt}`,
    salon.description?.trim()
      ? `Business context: ${salon.description.trim().slice(0, 180)}.`
      : "",
    "Use an elegant, welcoming premium beauty-business aesthetic with warm natural light.",
    "Wide 16:10 horizontal composition, with important subjects centered and safe for card cropping.",
    "No text, no lettering, no logos, no watermarks, no people looking directly at camera, and no UI elements.",
  ]
    .filter(Boolean)
    .join(" ");

  const result = await generateServiceImage({
    name: salon.name,
    customPrompt: instruction,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 502 }
    );
  }

  return NextResponse.json({
    imageBase64: `data:${result.mime};base64,${Buffer.from(result.bytes).toString("base64")}`,
    mimeType: result.mime,
    prompt,
  });
}
