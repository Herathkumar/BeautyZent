import { NextResponse } from "next/server";
import { generateCloudflareImage, cloudflareImageConfigured } from "@/lib/cloudflare-image";
import { businessTypeLabel, normalizeBusinessType } from "@/lib/marketplace";

const WINDOW_MS = 60 * 60 * 1000;
const MAX_GENERATIONS = 3;
const usage = new Map<string, { count: number; resetAt: number }>();

function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

function takeGeneration(ip: string) {
  const now = Date.now();
  if (usage.size > 1_000) {
    for (const [key, value] of usage) {
      if (value.resetAt <= now) usage.delete(key);
    }
  }
  const current = usage.get(ip);
  if (!current || current.resetAt <= now) {
    usage.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_GENERATIONS) return false;
  current.count += 1;
  return true;
}

export async function POST(req: Request) {
  if (!cloudflareImageConfigured()) {
    return NextResponse.json({ error: "AI cover generation is unavailable." }, { status: 503 });
  }

  const body = await req.json().catch(() => null);
  const prompt = String(body?.prompt || "").trim();
  const businessName = String(body?.businessName || "").trim();
  if (prompt.length < 8 || prompt.length > 400) {
    return NextResponse.json(
      { error: "Describe the cover you want in 8–400 characters." },
      { status: 400 }
    );
  }
  if (businessName.length < 2 || businessName.length > 80) {
    return NextResponse.json(
      { error: "Enter your business name before generating a cover." },
      { status: 400 }
    );
  }
  if (!takeGeneration(clientIp(req))) {
    return NextResponse.json(
      { error: "AI cover limit reached. Upload a photo or try again later." },
      { status: 429 }
    );
  }

  const type = businessTypeLabel(normalizeBusinessType(body?.businessType)).toLowerCase();
  const instruction = [
    `Create one photorealistic marketplace cover photo for "${businessName}", a ${type}.`,
    `Creative direction: ${prompt}`,
    "Use an elegant, welcoming premium beauty-business aesthetic with warm natural light.",
    "Keep the important subjects centered and safe for wide 16:10 card cropping.",
    "No text, lettering, logos, watermarks, or UI elements.",
  ].join(" ");
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
