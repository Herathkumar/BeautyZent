import { NextResponse } from "next/server";
import { getSession, isSalonStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { promotionSlideImageUrl } from "@/lib/promotion-slide-image";
import { PROMOTION_RULE_TYPES, type PromotionRuleType } from "@/lib/promotions";

const RULE_TYPES = new Set(PROMOTION_RULE_TYPES.map((t) => t.value));

function ruleSelect() {
  return {
    id: true,
    type: true,
    name: true,
    enabled: true,
    discountBps: true,
    discountCents: true,
    minVisits: true,
    minSpendCents: true,
    membersOnly: true,
    sortOrder: true,
  } as const;
}

function slideSelect() {
  return {
    id: true,
    title: true,
    enabled: true,
    sortOrder: true,
    durationSec: true,
    imageMime: true,
    imageUpdatedAt: true,
  } as const;
}

function settingsSelect() {
  return {
    loyaltyEnabled: true,
    discountsEnabled: true,
    loyaltyPointsPerDollar: true,
    loyaltyCentsPerPoint: true,
    loyaltyMaxRedeemPercent: true,
    promoBoardEnabled: true,
    promoBoardIntervalSec: true,
    promoBoardSlideSec: true,
  } as const;
}

function mapSlide(slide: {
  id: string;
  title: string | null;
  enabled: boolean;
  sortOrder: number;
  durationSec: number | null;
  imageMime: string | null;
  imageUpdatedAt: Date | null;
}) {
  const hasImage = Boolean(slide.imageUpdatedAt && slide.imageMime);
  return {
    ...slide,
    hasImage,
    imageUrl: promotionSlideImageUrl({
      id: slide.id,
      hasImage,
      imageUpdatedAt: slide.imageUpdatedAt,
    }),
  };
}

function normalizeSettingsInput(raw: Record<string, unknown>) {
  return {
    loyaltyEnabled: Boolean(raw.loyaltyEnabled),
    discountsEnabled: Boolean(raw.discountsEnabled),
    loyaltyPointsPerDollar: Math.max(0, Math.round(Number(raw.loyaltyPointsPerDollar ?? 1))),
    loyaltyCentsPerPoint: Math.max(1, Math.round(Number(raw.loyaltyCentsPerPoint ?? 5))),
    loyaltyMaxRedeemPercent: Math.min(
      100,
      Math.max(0, Math.round(Number(raw.loyaltyMaxRedeemPercent ?? 50)))
    ),
    promoBoardEnabled: Boolean(raw.promoBoardEnabled),
    promoBoardIntervalSec: Math.min(
      600,
      Math.max(30, Math.round(Number(raw.promoBoardIntervalSec ?? 90)))
    ),
    promoBoardSlideSec: Math.min(
      60,
      Math.max(3, Math.round(Number(raw.promoBoardSlideSec ?? 8)))
    ),
  };
}

function promoErrorMessage(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : "";
  if (/Unknown arg `loyaltyEnabled`|Unknown arg `discountsEnabled`|Unknown arg `promoBoardEnabled`/i.test(message)) {
    return "Prisma client is out of date. Stop the dev server, run pnpm db:generate, then restart with pnpm dev:local.";
  }
  if (err && typeof err === "object" && "code" in err) {
    const code = String((err as { code?: string }).code || "");
    if (code === "P2021" || code === "P2010" || code === "P2022") {
      return "Database schema is out of date. Run pnpm db:local:push, then restart the dev server.";
    }
  }
  if (/column .* does not exist|does not exist in the current database/i.test(message)) {
    return "Database schema is out of date. Run pnpm db:local:push, then restart the dev server.";
  }
  return message || fallback;
}

export async function GET() {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [salon, rules, slides] = await Promise.all([
      prisma.salon.findUnique({
        where: { id: session.salonId },
        select: settingsSelect(),
      }),
      prisma.promotionRule.findMany({
        where: { salonId: session.salonId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: ruleSelect(),
      }),
      prisma.promotionSlide.findMany({
        where: { salonId: session.salonId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: slideSelect(),
      }),
    ]);

    if (!salon) return NextResponse.json({ error: "Salon not found" }, { status: 404 });

    return NextResponse.json({
      settings: salon,
      rules,
      slides: slides.map(mapSlide),
      ruleTypes: PROMOTION_RULE_TYPES,
    });
  } catch (err) {
    console.error("[promotions GET]", err);
    return NextResponse.json(
      { error: promoErrorMessage(err, "Could not load promotion settings") },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  if (body.settings) {
    try {
      const salon = await prisma.salon.update({
        where: { id: session.salonId },
        data: normalizeSettingsInput(body.settings as Record<string, unknown>),
        select: settingsSelect(),
      });
      return NextResponse.json({ settings: salon, message: "Promotion settings saved." });
    } catch (err) {
      console.error("[promotions POST settings]", err);
      return NextResponse.json(
        { error: promoErrorMessage(err, "Could not save settings") },
        { status: 500 }
      );
    }
  }

  if (body.slide) {
    try {
      const maxOrder = await prisma.promotionSlide.aggregate({
        where: { salonId: session.salonId },
        _max: { sortOrder: true },
      });
      const title = String(body.slide.title || "").trim() || null;
      const slide = await prisma.promotionSlide.create({
        data: {
          salonId: session.salonId,
          title,
          enabled: body.slide.enabled !== false,
          durationSec:
            body.slide.durationSec != null
              ? Math.min(60, Math.max(3, Math.round(Number(body.slide.durationSec))))
              : null,
          sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        },
        select: slideSelect(),
      });
      return NextResponse.json({ slide: mapSlide(slide), message: "Display slide added." });
    } catch (err) {
      console.error("[promotions POST slide]", err);
      return NextResponse.json(
        { error: promoErrorMessage(err, "Could not add display slide") },
        { status: 500 }
      );
    }
  }

  const type = String(body.type || "") as PromotionRuleType;
  const name = String(body.name || "").trim();
  if (!RULE_TYPES.has(type) || !name) {
    return NextResponse.json({ error: "Valid type and name required" }, { status: 400 });
  }

  try {
    const maxOrder = await prisma.promotionRule.aggregate({
      where: { salonId: session.salonId },
      _max: { sortOrder: true },
    });

    const rule = await prisma.promotionRule.create({
      data: {
        salonId: session.salonId,
        type,
        name,
        enabled: body.enabled !== false,
        discountBps: body.discountBps != null ? Math.round(Number(body.discountBps)) : null,
        discountCents: body.discountCents != null ? Math.round(Number(body.discountCents)) : null,
        minVisits: body.minVisits != null ? Math.round(Number(body.minVisits)) : null,
        minSpendCents: body.minSpendCents != null ? Math.round(Number(body.minSpendCents)) : null,
        membersOnly: Boolean(body.membersOnly),
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
      select: ruleSelect(),
    });

    return NextResponse.json({ rule, message: "Rule added." });
  } catch (err) {
    console.error("[promotions POST rule]", err);
    return NextResponse.json(
      { error: promoErrorMessage(err, "Could not add rule") },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (body.slide) {
    const existing = await prisma.promotionSlide.findFirst({
      where: { id, salonId: session.salonId },
    });
    if (!existing) return NextResponse.json({ error: "Slide not found" }, { status: 404 });

    const slide = await prisma.promotionSlide.update({
      where: { id },
      data: {
        ...(body.slide.title != null
          ? { title: String(body.slide.title).trim() || null }
          : {}),
        ...(typeof body.slide.enabled === "boolean" ? { enabled: body.slide.enabled } : {}),
        ...(body.slide.durationSec != null
          ? {
              durationSec: Math.min(60, Math.max(3, Math.round(Number(body.slide.durationSec)))),
            }
          : {}),
      },
      select: slideSelect(),
    });
    return NextResponse.json({ slide: mapSlide(slide), message: "Display slide updated." });
  }

  const existing = await prisma.promotionRule.findFirst({
    where: { id, salonId: session.salonId },
  });
  if (!existing) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  const rule = await prisma.promotionRule.update({
    where: { id },
    data: {
      ...(body.name != null ? { name: String(body.name).trim() || existing.name } : {}),
      ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
      ...(body.discountBps != null ? { discountBps: Math.round(Number(body.discountBps)) } : {}),
      ...(body.discountCents != null ? { discountCents: Math.round(Number(body.discountCents)) } : {}),
      ...(body.minVisits != null ? { minVisits: Math.round(Number(body.minVisits)) } : {}),
      ...(body.minSpendCents != null ? { minSpendCents: Math.round(Number(body.minSpendCents)) } : {}),
      ...(typeof body.membersOnly === "boolean" ? { membersOnly: body.membersOnly } : {}),
    },
    select: ruleSelect(),
  });

  return NextResponse.json({ rule, message: "Rule updated." });
}

export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || !isSalonStaff(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get("id") || "";
  const slideId = url.searchParams.get("slideId") || "";
  const targetId = slideId || id;
  if (!targetId) return NextResponse.json({ error: "id required" }, { status: 400 });

  if (slideId) {
    const existing = await prisma.promotionSlide.findFirst({
      where: { id: slideId, salonId: session.salonId },
    });
    if (!existing) return NextResponse.json({ error: "Slide not found" }, { status: 404 });
    await prisma.promotionSlide.delete({ where: { id: slideId } });
    return NextResponse.json({ ok: true, message: "Display slide removed." });
  }

  const existing = await prisma.promotionRule.findFirst({
    where: { id, salonId: session.salonId },
  });
  if (!existing) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  await prisma.promotionRule.delete({ where: { id } });
  return NextResponse.json({ ok: true, message: "Rule removed." });
}
