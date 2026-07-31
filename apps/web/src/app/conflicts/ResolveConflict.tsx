"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ResolveConflict({
  conflictId,
  productId,
  suggested,
}: {
  conflictId: string;
  productId: string | null;
  suggested: number;
}) {
  const router = useRouter();
  const [onHand, setOnHand] = useState(Math.max(0, suggested));
  const [busy, setBusy] = useState(false);

  async function resolve() {
    setBusy(true);
    await fetch("/api/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conflictId,
        resolution: productId
          ? `Set on hand to ${onHand}`
          : "Acknowledged oversell",
        adjustOnHandTo: productId ? onHand : undefined,
      }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="row">
      {productId && (
        <input
          type="number"
          style={{ width: 90 }}
          value={onHand}
          onChange={(e) => setOnHand(Number(e.target.value))}
        />
      )}
      <button className="btn" disabled={busy} onClick={resolve}>
        Resolve
      </button>
    </div>
  );
}
