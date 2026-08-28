"use client";

import { PromotionsSettings } from "@/components/admin/PromotionsSettings";

export default function AdminPromotionsPage() {
  return (
    <main className="space-y-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-[#7d6154] uppercase">Money</p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl">Loyalty & discounts</h1>
        <p className="mt-2 text-muted">
          Enable member loyalty points and automatic discount rules. They apply at reception
          checkout when a matching client or cart qualifies.
        </p>
      </div>

      <PromotionsSettings />
    </main>
  );
}
