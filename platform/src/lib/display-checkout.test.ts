import { describe, expect, it } from "vitest";
import { buildCheckoutSavingsMessage } from "@/lib/display-checkout";

describe("buildCheckoutSavingsMessage", () => {
  it("returns promotion savings copy", () => {
    expect(
      buildCheckoutSavingsMessage({
        discountCents: 257,
        discountLabel: "Member 10% off",
        loyaltyRedeemCents: 0,
      })
    ).toBe("You saved $2.57 today with Member 10% off.");
  });

  it("combines promotion and loyalty savings", () => {
    expect(
      buildCheckoutSavingsMessage({
        discountCents: 500,
        discountLabel: "First visit 10% off",
        loyaltyRedeemCents: 1000,
      })
    ).toBe("You saved $15.00 today with First visit 10% off and loyalty points.");
  });

  it("returns null when there are no savings", () => {
    expect(
      buildCheckoutSavingsMessage({
        discountCents: 0,
        discountLabel: null,
        loyaltyRedeemCents: 0,
      })
    ).toBeNull();
  });
});
