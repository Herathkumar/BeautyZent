import { describe, expect, it } from "vitest";
import {
  evaluateCheckoutPromotions,
  type PromotionRuleRecord,
  type SalonPromoSettings,
} from "@/lib/promotions";

const settings: SalonPromoSettings = {
  loyaltyEnabled: true,
  discountsEnabled: true,
  loyaltyPointsPerDollar: 1,
  loyaltyCentsPerPoint: 5,
  loyaltyMaxRedeemPercent: 50,
};

const memberRule: PromotionRuleRecord = {
  id: "1",
  type: "MEMBER_PERCENT",
  name: "Member 10%",
  enabled: true,
  discountBps: 1000,
  discountCents: null,
  minVisits: null,
  minSpendCents: null,
  membersOnly: true,
  sortOrder: 0,
};

describe("evaluateCheckoutPromotions", () => {
  it("applies best member discount before tax base", () => {
    const result = evaluateCheckoutPromotions(5000, settings, [memberRule], {
      isMember: true,
      visitCount: 2,
      loyaltyPointsBalance: 0,
      redeemPointsEnabled: false,
    });
    expect(result.discountCents).toBe(500);
    expect(result.chargedCents).toBe(4500);
    expect(result.loyaltyPointsEarned).toBe(45);
  });

  it("redeems loyalty points after discount", () => {
    const result = evaluateCheckoutPromotions(5000, settings, [memberRule], {
      isMember: true,
      visitCount: 2,
      loyaltyPointsBalance: 200,
      redeemPointsEnabled: true,
    });
    expect(result.discountCents).toBe(500);
    expect(result.loyaltyRedeemCents).toBe(1000);
    expect(result.loyaltyPointsRedeemed).toBe(200);
    expect(result.chargedCents).toBe(3500);
  });

  it("skips discounts when disabled", () => {
    const result = evaluateCheckoutPromotions(
      5000,
      { ...settings, discountsEnabled: false },
      [memberRule],
      {
        isMember: true,
        visitCount: 0,
        loyaltyPointsBalance: 0,
        redeemPointsEnabled: false,
      }
    );
    expect(result.discountCents).toBe(0);
    expect(result.chargedCents).toBe(5000);
  });
});
