"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ProductForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    sku: "",
    barcode: "",
    name: "",
    description: "",
    priceCents: 999,
    taxBps: 1300,
    onHand: 0,
    reorderPoint: 5,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, active: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setForm({
        sku: "",
        barcode: "",
        name: "",
        description: "",
        priceCents: 999,
        taxBps: 1300,
        onHand: 0,
        reorderPoint: 5,
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>Add product</h2>
      {(
        [
          ["sku", "SKU"],
          ["barcode", "Barcode"],
          ["name", "Name"],
          ["description", "Description"],
        ] as const
      ).map(([key, label]) => (
        <div className="field" key={key}>
          <label>{label}</label>
          <input
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
            required={key === "sku" || key === "name"}
          />
        </div>
      ))}
      <div className="field">
        <label>Price (cents)</label>
        <input
          type="number"
          value={form.priceCents}
          onChange={(e) =>
            setForm({ ...form, priceCents: Number(e.target.value) })
          }
        />
      </div>
      <div className="field">
        <label>Tax (basis points, 1300 = 13%)</label>
        <input
          type="number"
          value={form.taxBps}
          onChange={(e) => setForm({ ...form, taxBps: Number(e.target.value) })}
        />
      </div>
      <div className="field">
        <label>On hand</label>
        <input
          type="number"
          value={form.onHand}
          onChange={(e) => setForm({ ...form, onHand: Number(e.target.value) })}
        />
      </div>
      <div className="field">
        <label>Reorder point</label>
        <input
          type="number"
          value={form.reorderPoint}
          onChange={(e) =>
            setForm({ ...form, reorderPoint: Number(e.target.value) })
          }
        />
      </div>
      {error && <p style={{ color: "var(--danger)" }}>{error}</p>}
      <button className="btn" disabled={busy} type="submit">
        Save product
      </button>
    </form>
  );
}
