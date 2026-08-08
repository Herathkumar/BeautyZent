import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientSessionForSalon } from "@/lib/client-auth";
import { calendarDateInTz } from "@/lib/salon-time";
import { generateStylePreview, styleAiConfigured } from "@/lib/style-ai";
import {
  MAX_STYLE_AI_PER_DAY,
  STYLE_PRESETS,
  decodeStylePhoto,
  normalizeStylePrompt,
} from "@/lib/style-prefs";

function clientIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  return NextResponse.json({
    configured: styleAiConfigured(),
    presets: STYLE_PRESETS.map((p) => ({ id: p.id, label: p.label })),
    maxPerDay: MAX_STYLE_AI_PER_DAY,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const salon = await prisma.salon.findUnique({ where: { slug } });
  if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

  if (!styleAiConfigured()) {
    return NextResponse.json(
      {
        error:
          "Style AI is not configured yet. You can still upload a photo or pick from your look book.",
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Photo required" }, { status: 400 });

  const decoded = decodeStylePhoto(body.imageBase64, body.mimeType);
  if (!decoded.ok) {
    return NextResponse.json({ error: decoded.error }, { status: 400 });
  }

  const preset = STYLE_PRESETS.find((p) => p.id === body.presetId);
  const custom = normalizeStylePrompt(body.prompt);
  const prompt = preset?.prompt || custom;
  if (!prompt) {
    return NextResponse.json(
      { error: "Pick a style preset or describe the look you want." },
      { status: 400 }
    );
  }

  const session = await getClientSessionForSalon(salon.id);
  const day = calendarDateInTz(salon.timezone || "America/Toronto");
  const usageKey = session
    ? `client:${session.clientId}`
    : `ip:${createHash("sha256").update(clientIp(req)).digest("hex").slice(0, 24)}`;

  const usage = await prisma.styleAiUsage.upsert({
    where: {
      salonId_usageKey_day: { salonId: salon.id, usageKey, day },
    },
    create: { salonId: salon.id, usageKey, day, count: 0 },
    update: {},
  });
  if (usage.count >= MAX_STYLE_AI_PER_DAY) {
    return NextResponse.json(
      {
        error: `Free Style AI limit reached (${MAX_STYLE_AI_PER_DAY}/day). Upload a photo or try again tomorrow.`,
      },
      { status: 429 }
    );
  }

  const result = await generateStylePreview({
    imageBytes: decoded.photo.bytes,
    mime: decoded.photo.mime,
    prompt,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status || 502 }
    );
  }

  await prisma.styleAiUsage.update({
    where: { id: usage.id },
    data: { count: { increment: 1 } },
  });

  const remaining = Math.max(0, MAX_STYLE_AI_PER_DAY - (usage.count + 1));
  const dataUrl = `data:${result.mime};base64,${result.bytes.toString("base64")}`;

  return NextResponse.json({
    imageBase64: dataUrl,
    mimeType: result.mime,
    prompt: preset?.label || custom,
    remainingToday: remaining,
  });
}
