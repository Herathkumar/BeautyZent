import { NextResponse } from "next/server";
import {
  cloudflareImageConfigured,
  generateCloudflareImage,
} from "@/lib/cloudflare-image";
import { businessTypeLabel } from "@/lib/marketplace";
import { getPlatformSession } from "@/lib/platform-auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const session = await getPlatformSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!cloudflareImageConfigured()) {
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

  const { id } = await params;
  const salon = await prisma.salon.findUnique({
    where: { id },
    select: { name: true, businessType: true, description: true },
  });
  if (!salon) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const instruction = [
    `Create one photorealistic marketplace cover photo for "${salon.name}", a ${businessTypeLabel(salon.businessType).toLowerCase()}.`,
    `Creative direction: ${prompt}`,
    salon.description?.trim()
      ? `Business context: ${salon.description.trim().slice(0, 180)}.`
      : "",
    "Use an elegant, welcoming premium beauty-business aesthetic with warm natural light.",
    "Wide 16:10 horizontal composition with important subjects centered for card cropping.",
    "No text, lettering, logos, watermarks, UI elements, or people looking at the camera.",
  ]
    .filter(Boolean)
    .join(" ");

  const result = await generateCloudflareImage(instruction);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 502 }
    );
  }

  return NextResponse.json({
    imageBase64: `data:${result.mime};base64,${Buffer.from(result.bytes).toString("base64")}`,
    mimeType: result.mime,
  });
}
