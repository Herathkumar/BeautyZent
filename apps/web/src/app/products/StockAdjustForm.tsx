"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function StockAdjustForm({
  products,
}: {
  products: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [delta, setDelta] = useState(1);
  const [type, setType] = useState<"receive" | "adjust">("receive");
  const [reason, setReason] = useState("Stock receive");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/inventory/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, delta, type, reason }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    router.refresh();
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Receive / adjust stock</h2>
      <div className="field">
        <label>Product</label>
        <select value={productId} onChange={(e) => setProductId(e.target.value)}>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as "receive" | "adjust")}
        >
          <option value="receive">Receive</option>
          <option value="adjust">Adjust</option>
        </select>
      </div>
      <div className="field">
        <label>Delta (+/-)</label>
        <input
          type="number"
          value={delta}
          onChange={(e) => setDelta(Number(e.target.value))}
        />
      </div>
      <div className="field">
        <label>Reason</label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn" type="submit">
        Apply
      </button>
    </form>
  );
}
