"use client";

import { useEffect, useState } from "react";
import { formatCad } from "@/lib/money";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  priceCents: number;
  stockQty: number;
  active: boolean;
};

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("18");
  const [stockQty, setStockQty] = useState(10);
  const [sku, setSku] = useState("");

  async function load() {
    const res = await fetch("/api/admin/products");
    if (res.status === 401) {
      window.location.href = "/manager/login";
      return;
    }
    const data = await res.json();
    setProducts(data.products || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, price, stockQty, sku }),
    });
    setName("");
    setSku("");
    await load();
  }

  async function save(p: Product, patch: Partial<{ price: string; stockQty: number; active: boolean }>) {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, ...patch }),
    });
    await load();
  }

  return (
    <main className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Retail products</h1>
        <p className="text-muted">Track salon products for sale (shampoo, oil, etc.).</p>
      </div>

      <form onSubmit={addProduct} className="grid gap-3 rounded-2xl border border-ink/10 bg-cream p-4 sm:grid-cols-5">
        <input
          required
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2 sm:col-span-2"
        />
        <input
          placeholder="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2"
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2"
          placeholder="Price"
        />
        <div className="flex gap-2">
          <input
            type="number"
            value={stockQty}
            onChange={(e) => setStockQty(Number(e.target.value))}
            className="w-full rounded-xl border border-ink/15 px-3 py-2"
          />
          <button type="submit" className="btn-solid rounded-full px-4">
            Add
          </button>
        </div>
      </form>

      <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-cream">
        {products.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="font-medium">{p.name}</p>
              <p className="text-sm text-muted">
                {p.sku || "No SKU"} · {formatCad(p.priceCents)} · stock {p.stockQty}
                {!p.active && " · inactive"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="w-20 rounded-lg border border-ink/15 px-2 py-1 text-sm"
                defaultValue={p.stockQty}
                onBlur={(e) => save(p, { stockQty: Number(e.target.value) })}
              />
              <input
                className="w-24 rounded-lg border border-ink/15 px-2 py-1 text-sm"
                defaultValue={(p.priceCents / 100).toFixed(2)}
                onBlur={(e) => save(p, { price: e.target.value })}
              />
              <button
                type="button"
                onClick={() => save(p, { active: !p.active })}
                className="rounded-full border border-ink/20 px-3 py-1 text-sm"
              >
                {p.active ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
