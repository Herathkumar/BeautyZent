export type PromotionRuleType =
  | "MEMBER_PERCENT"
  | "FIRST_VISIT"
  | "VISIT_MILESTONE"
  | "MIN_SPEND_PERCENT"
  | "MIN_SPEND_FLAT";

export type PromotionRuleRecord = {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  discountBps: number | null;
  discountCents: number | null;
  minVisits: number | null;
  minSpendCents: number | null;
  membersOnly: boolean;
  sortOrder: number;
};

export type SalonPromoSettings = {
  loyaltyEnabled: boolean;
  discountsEnabled: boolean;
  loyaltyPointsPerDollar: number;
  loyaltyCentsPerPoint: number;
  loyaltyMaxRedeemPercent: number;
};

export type CheckoutPromoContext = {
  isMember: boolean;
  visitCount: number;
  loyaltyPointsBalance: number;
  redeemPointsEnabled: boolean;
};

export type PromoEvaluation = {
  catalogSubtotalCents: number;
  discountCents: number;
  discountLabel: string | null;
  loyaltyRedeemCents: number;
  loyaltyPointsRedeemed: number;
  loyaltyPointsEarned: number;
  adjustmentCents: number;
  chargedCents: number;
};

function percentOff(subtotalCents: number, bps: number) {
  return Math.round((subtotalCents * Math.max(0, bps)) / 10_000);
}

function ruleEligible(rule: PromotionRuleRecord, ctx: CheckoutPromoContext) {
  if (!rule.enabled) return false;
  if (rule.membersOnly && !ctx.isMember) return false;
  return true;
}

export function savingsForRule(
  rule: PromotionRuleRecord,
  subtotalCents: number,
  ctx: CheckoutPromoContext
): number {
  if (!ruleEligible(rule, ctx)) return 0;
  const type = rule.type as PromotionRuleType;

  if (type === "MEMBER_PERCENT") {
    if (!ctx.isMember || !rule.discountBps) return 0;
    return percentOff(subtotalCents, rule.discountBps);
  }
  if (type === "FIRST_VISIT") {
    if (ctx.visitCount > 0) return 0;
    if (rule.discountBps) return percentOff(subtotalCents, rule.discountBps);
    return Math.max(0, rule.discountCents || 0);
  }
  if (type === "VISIT_MILESTONE") {
    const target = rule.minVisits ?? 0;
    if (target <= 0 || ctx.visitCount + 1 !== target) return 0;
    if (rule.discountBps) return percentOff(subtotalCents, rule.discountBps);
    return Math.max(0, rule.discountCents || 0);
  }
  if (type === "MIN_SPEND_PERCENT") {
    const min = rule.minSpendCents ?? 0;
    if (subtotalCents < min || !rule.discountBps) return 0;
    return percentOff(subtotalCents, rule.discountBps);
  }
  if (type === "MIN_SPEND_FLAT") {
    const min = rule.minSpendCents ?? 0;
    if (subtotalCents < min) return 0;
    return Math.max(0, rule.discountCents || 0);
  }
  return 0;
}

export function bestDiscount(
  subtotalCents: number,
  rules: PromotionRuleRecord[],
  ctx: CheckoutPromoContext,
  discountsEnabled: boolean
): { discountCents: number; label: string | null } {
  if (!discountsEnabled || subtotalCents <= 0) {
    return { discountCents: 0, label: null };
  }
  let best = { discountCents: 0, label: null as string | null };
  for (const rule of rules) {
    const savings = savingsForRule(rule, subtotalCents, ctx);
    if (savings > best.discountCents) {
      best = { discountCents: savings, label: rule.name };
    }
  }
  return best;
}

export function loyaltyRedemption(
  subtotalAfterDiscount: number,
  settings: SalonPromoSettings,
  ctx: CheckoutPromoContext
): { redeemCents: number; pointsRedeemed: number } {
  if (
    !settings.loyaltyEnabled ||
    !ctx.isMember ||
    !ctx.redeemPointsEnabled ||
    subtotalAfterDiscount <= 0 ||
    ctx.loyaltyPointsBalance <= 0 ||
    settings.loyaltyCentsPerPoint <= 0
  ) {
    return { redeemCents: 0, pointsRedeemed: 0 };
  }
  const maxByBalance = ctx.loyaltyPointsBalance * settings.loyaltyCentsPerPoint;
  const maxByPercent = Math.round(
    (subtotalAfterDiscount * Math.max(0, settings.loyaltyMaxRedeemPercent)) / 100
  );
  const redeemCents = Math.min(subtotalAfterDiscount, maxByBalance, maxByPercent);
  const pointsRedeemed = Math.floor(redeemCents / settings.loyaltyCentsPerPoint);
  const actualRedeem = pointsRedeemed * settings.loyaltyCentsPerPoint;
  return { redeemCents: actualRedeem, pointsRedeemed };
}

export function loyaltyEarnPreview(
  chargedCents: number,
  settings: SalonPromoSettings,
  isMember: boolean
) {
  if (!settings.loyaltyEnabled || !isMember || chargedCents <= 0) return 0;
  const perDollar = Math.max(0, settings.loyaltyPointsPerDollar);
  return Math.floor(chargedCents / 100) * perDollar;
}

export function evaluateCheckoutPromotions(
  catalogSubtotalCents: number,
  settings: SalonPromoSettings,
  rules: PromotionRuleRecord[],
  ctx: CheckoutPromoContext
): PromoEvaluation {
  const { discountCents, label } = bestDiscount(
    catalogSubtotalCents,
    rules,
    ctx,
    settings.discountsEnabled
  );
  const afterDiscount = Math.max(0, catalogSubtotalCents - discountCents);
  const { redeemCents, pointsRedeemed } = loyaltyRedemption(afterDiscount, settings, ctx);
  const chargedCents = Math.max(0, afterDiscount - redeemCents);
  const loyaltyPointsEarned = loyaltyEarnPreview(chargedCents, settings, ctx.isMember);
  const adjustmentCents = -(discountCents + redeemCents);

  return {
    catalogSubtotalCents,
    discountCents,
    discountLabel: label,
    loyaltyRedeemCents: redeemCents,
    loyaltyPointsRedeemed: pointsRedeemed,
    loyaltyPointsEarned,
    adjustmentCents,
    chargedCents,
  };
}

export type PromotionRuleLabelInput = {
  type: PromotionRuleType;
  discountBps: number;
  discountCents: number;
  minVisits: number;
  minSpendCents: number;
};

function formatPercent(bps: number) {
  const pct = Math.max(0, bps) / 100;
  if (Number.isInteger(pct)) return String(pct);
  return pct.toFixed(1).replace(/\.0$/, "");
}

function formatDollarAmount(cents: number) {
  const n = Math.max(0, Math.round(cents));
  const dollars = n / 100;
  return Number.isInteger(dollars) ? String(dollars) : (n / 100).toFixed(2);
}

function formatPercentOff(bps: number) {
  return `${formatPercent(bps)}% off`;
}

function formatFlatOff(cents: number) {
  return `$${formatDollarAmount(cents)} off`;
}

function formatMinSpendPhrase(cents: number) {
  return `$${formatDollarAmount(cents)}+ spend`;
}

function visitMilestoneLabel(visitNumber: number) {
  const n = Math.max(1, Math.round(visitNumber));
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th visit`;
  if (mod10 === 1) return `${n}st visit`;
  if (mod10 === 2) return `${n}nd visit`;
  if (mod10 === 3) return `${n}rd visit`;
  return `${n}th visit`;
}

function primaryDiscountPhrase(bps: number, cents: number, preferPercent: boolean) {
  if (preferPercent && bps > 0) return formatPercentOff(bps);
  if (cents > 0) return formatFlatOff(cents);
  if (bps > 0) return formatPercentOff(bps);
  return "discount";
}

/** Customer-facing checkout label from rule draft fields. */
export function generatePromotionRuleLabel(input: PromotionRuleLabelInput): string {
  const { type, discountBps, discountCents, minVisits, minSpendCents } = input;

  switch (type) {
    case "MEMBER_PERCENT":
      return `Member ${formatPercentOff(discountBps)}`;
    case "FIRST_VISIT":
      return `First visit ${primaryDiscountPhrase(discountBps, discountCents, discountBps > 0)}`;
    case "VISIT_MILESTONE":
      return `${visitMilestoneLabel(minVisits)} ${primaryDiscountPhrase(
        discountBps,
        discountCents,
        true
      )}`;
    case "MIN_SPEND_PERCENT":
      return `${formatPercentOff(discountBps)} on ${formatMinSpendPhrase(minSpendCents)}`;
    case "MIN_SPEND_FLAT":
      return `${formatFlatOff(discountCents)} on ${formatMinSpendPhrase(minSpendCents)}`;
    default:
      return "Discount";
  }
}

export const PROMOTION_RULE_TYPES: {
  value: PromotionRuleType;
  label: string;
  hint: string;
}[] = [
  {
    value: "MEMBER_PERCENT",
    label: "Member discount",
    hint: "Percent off for verified members",
  },
  {
    value: "FIRST_VISIT",
    label: "First visit",
    hint: "Welcome offer for new clients",
  },
  {
    value: "VISIT_MILESTONE",
    label: "Visit milestone",
    hint: "Reward on the Nth visit (e.g. 5th)",
  },
  {
    value: "MIN_SPEND_PERCENT",
    label: "Min spend % off",
    hint: "Percent off when subtotal exceeds minimum",
  },
  {
    value: "MIN_SPEND_FLAT",
    label: "Min spend flat off",
    hint: "Fixed amount off when subtotal exceeds minimum",
  },
];
