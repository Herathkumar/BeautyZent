"use client";

import { useRouter } from "next/navigation";

export function OrderActions({
  orderId,
  status,
  channel,
}: {
  orderId: string;
  status: string;
  channel: string;
}) {
  const router = useRouter();

  async function setStatus(next: "fulfilled" | "completed" | "cancelled") {
    const res = await fetch(`/api/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) router.refresh();
  }

  if (channel !== "online") return null;
  if (!["reserved", "paid", "pending_payment"].includes(status)) return null;

  return (
    <div className="row">
      <button className="btn" onClick={() => setStatus("fulfilled")}>
        Fulfill
      </button>
      <button className="btn secondary" onClick={() => setStatus("cancelled")}>
        Cancel
      </button>
    </div>
  );
}
