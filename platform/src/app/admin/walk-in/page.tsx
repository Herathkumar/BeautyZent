"use client";

import Link from "next/link";
import { WalkInPanel } from "@/components/WalkInPanel";

export default function ManagerWalkInPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Walk-in</h1>
          <p className="text-muted">
            Seat a guest now or add them to the waitlist with an estimated wait.
          </p>
        </div>
        <Link
          href="/manager/appointments"
          className="text-sm text-[#7d6154] underline-offset-2 hover:underline"
        >
          View bookings
        </Link>
      </div>
      <WalkInPanel mode="manager" />
    </main>
  );
}
