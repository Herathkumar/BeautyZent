import { describe, expect, it } from "vitest";
import { buildPromotionBoardPayload, buildPromotionBoardTemplate } from "@/lib/promotion-board";

describe("promotion board templates", () => {
  it("builds first-visit welcome card", () => {
    const template = buildPromotionBoardTemplate({
      id: "1",
      type: "FIRST_VISIT",
      name: "First visit 10% off",
      enabled: true,
      discountBps: 1000,
      discountCents: null,
      minVisits: null,
      minSpendCents: null,
    });
    expect(template.icon).toBe("handshake");
    expect(template.offer).toBe("10% OFF");
    expect(template.headline).toMatch(/welcome/i);
  });

  it("only includes enabled rules when board is on", () => {
    const board = buildPromotionBoardPayload({
      enabled: true,
      intervalSec: 90,
      showSec: 24,
      defaultSlideSec: 8,
      salonName: "Aura Salon",
      rules: [
        {
          id: "a",
          type: "MEMBER_PERCENT",
          name: "Member 10% off",
          enabled: true,
          discountBps: 1000,
          discountCents: null,
          minVisits: null,
          minSpendCents: null,
        },
        {
          id: "b",
          type: "FIRST_VISIT",
          name: "First visit 10% off",
          enabled: false,
          discountBps: 1000,
          discountCents: null,
          minVisits: null,
          minSpendCents: null,
        },
      ],
    });
    expect(board.enabled).toBe(true);
    expect(board.slides).toHaveLength(1);
    expect(board.slides[0].thumbLabel).toBe("Member 10% off");
  });
});
