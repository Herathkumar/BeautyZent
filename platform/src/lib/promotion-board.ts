import type { PromotionRuleType } from "@/lib/promotions";
import { generatePromotionRuleLabel } from "@/lib/promotions";

export type PromoBoardIcon =
  | "crown"
  | "handshake"
  | "milestone"
  | "spend"
  | "gift";

export type PromoBoardTemplate = {
  icon: PromoBoardIcon;
  eyebrow: string;
  /** Primary white title line, e.g. "Member" or "Spend $80+" */
  headline: string;
  /** Optional gold italic second line, e.g. "rewards" */
  headlineAccent?: string;
  offer: string;
  description: string;
};

export type PromotionBoardSlide = {
  id: string;
  type: PromotionRuleType | string;
  name: string;
  thumbLabel: string;
  durationSec: number;
  template: PromoBoardTemplate;
};

export type PromotionBoardPayload = {
  enabled: boolean;
  intervalSec: number;
  showSec: number;
  defaultSlideSec: number;
  salonName: string;
  slides: PromotionBoardSlide[];
};

type RuleLike = {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  discountBps: number | null;
  discountCents: number | null;
  minVisits: number | null;
  minSpendCents: number | null;
};

function formatPercent(bps: number) {
  const pct = Math.max(0, bps) / 100;
  if (Number.isInteger(pct)) return String(pct);
  return pct.toFixed(1).replace(/\.0$/, "");
}

function formatDollar(cents: number) {
  const n = Math.max(0, Math.round(cents));
  const dollars = n / 100;
  return Number.isInteger(dollars) ? String(dollars) : (n / 100).toFixed(2);
}

function visitOrdinal(visitNumber: number) {
  const n = Math.max(1, Math.round(visitNumber));
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  if (mod10 === 1) return `${n}st`;
  if (mod10 === 2) return `${n}nd`;
  if (mod10 === 3) return `${n}rd`;
  return `${n}th`;
}

export function buildPromotionBoardTemplate(rule: RuleLike): PromoBoardTemplate {
  const type = rule.type as PromotionRuleType;
  const bps = rule.discountBps ?? 0;
  const cents = rule.discountCents ?? 0;
  const visits = rule.minVisits ?? 0;
  const minSpend = rule.minSpendCents ?? 0;
  const pct = formatPercent(bps);
  const dollars = formatDollar(cents);
  const spend = formatDollar(minSpend);

  switch (type) {
    case "MEMBER_PERCENT":
      return {
        icon: "gift",
        eyebrow: "Members only",
        headline: "Member",
        headlineAccent: "rewards",
        offer: `${pct}% OFF`,
        description: "Verified members save on every visit. Ask reception to join.",
      };
    case "FIRST_VISIT":
      return {
        icon: "handshake",
        eyebrow: "Welcome offer",
        headline: "Welcome",
        headlineAccent: "new guests",
        offer: bps > 0 ? `${pct}% OFF` : `$${dollars} OFF`,
        description: "Your first visit is on us — a little welcome gift from our team.",
      };
    case "VISIT_MILESTONE":
      return {
        icon: "milestone",
        eyebrow: "Loyalty milestone",
        headline: `Celebrate your ${visitOrdinal(visits)} visit`,
        offer: bps > 0 ? `${pct}% OFF` : `$${dollars} OFF`,
        description: `Book your ${visitOrdinal(visits)} visit and enjoy a special thank-you discount.`,
      };
    case "MIN_SPEND_PERCENT":
      return {
        icon: "spend",
        eyebrow: "Spend & save",
        headline: `Spend $${spend}+`,
        offer: `${pct}% OFF`,
        description: `Enjoy ${pct}% off when your visit total reaches $${spend}.`,
      };
    case "MIN_SPEND_FLAT":
      return {
        icon: "spend",
        eyebrow: "Spend & save",
        headline: `Spend $${spend}+`,
        offer: `$${dollars} OFF`,
        description: `Take $${dollars} off when your visit total reaches $${spend}.`,
      };
    default:
      return {
        icon: "gift",
        eyebrow: "Special offer",
        headline: rule.name || "Promotion",
        offer: "SAVE TODAY",
        description: "Ask reception about today’s specials.",
      };
  }
}

export function buildPromotionBoardSlide(
  rule: RuleLike,
  defaultSlideSec: number
): PromotionBoardSlide {
  const thumbLabel =
    rule.name?.trim() ||
    generatePromotionRuleLabel({
      type: rule.type as PromotionRuleType,
      discountBps: rule.discountBps ?? 0,
      discountCents: rule.discountCents ?? 0,
      minVisits: rule.minVisits ?? 0,
      minSpendCents: rule.minSpendCents ?? 0,
    });

  return {
    id: rule.id,
    type: rule.type,
    name: rule.name,
    thumbLabel,
    durationSec: Math.min(60, Math.max(3, defaultSlideSec)),
    template: buildPromotionBoardTemplate(rule),
  };
}

export function buildPromotionBoardPayload(opts: {
  enabled: boolean;
  intervalSec: number;
  showSec: number;
  defaultSlideSec: number;
  salonName: string;
  rules: RuleLike[];
}): PromotionBoardPayload {
  const slides = opts.rules
    .filter((r) => r.enabled)
    .map((r) => buildPromotionBoardSlide(r, opts.defaultSlideSec));

  return {
    enabled: opts.enabled && slides.length > 0,
    intervalSec: Math.min(600, Math.max(30, opts.intervalSec)),
    showSec: Math.min(300, Math.max(5, opts.showSec)),
    defaultSlideSec: Math.min(60, Math.max(3, opts.defaultSlideSec)),
    salonName: opts.salonName,
    slides,
  };
}
