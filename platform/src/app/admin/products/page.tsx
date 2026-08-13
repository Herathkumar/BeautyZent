"use client";

import { useEffect, useRef, useState } from "react";
import { formatCad } from "@/lib/money";
import { fileToJpegDataUrl } from "@/lib/photo-resize";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  priceCents: number;
  stockQty: number;
  active: boolean;
  hasImage?: boolean;
  imageUrl?: string | null;
};

export default function ProductsAdminPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("18");
  const [stockQty, setStockQty] = useState(10);
  const [sku, setSku] = useState("");
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<string | null>(null);

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

  async function addProduct(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nextName = String(fd.get("name") || name).trim();
    const nextPrice = String(fd.get("price") || price);
    const nextSku = String(fd.get("sku") || sku);
    const nextStock = Number(fd.get("stockQty") || stockQty);
    if (!nextName) {
      setMessage("Name is required");
      return;
    }
    setMessage("");
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nextName,
        price: nextPrice,
        stockQty: nextStock,
        sku: nextSku,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Could not add product");
      return;
    }
    setName("");
    setSku("");
    await load();
    if (data.product?.id) {
      setMessage(`Added ${data.product.name}. Add a photo or generate one with AI.`);
    }
  }

  async function save(
    p: Product,
    patch: Partial<{ price: string; stockQty: number; active: boolean }>
  ) {
    await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, ...patch }),
    });
    await load();
  }

  async function uploadPhoto(productId: string, file: File) {
    setBusyId(productId);
    setMessage("");
    try {
      const dataUrl = await fileToJpegDataUrl(file, 900, 0.84);
      const res = await fetch(`/api/admin/products/${productId}/image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: dataUrl, mimeType: "image/jpeg" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Could not save photo");
        return;
      }
      setMessage("Product photo saved.");
      await load();
    } catch {
      setMessage("Could not process that photo.");
    } finally {
      setBusyId(null);
    }
  }

  async function generateImage(productId: string) {
    setBusyId(productId);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/products/${productId}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Could not generate image");
        return;
      }
      setMessage(`AI image ready for ${data.product?.name || "product"}.`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function pickUpload(productId: string) {
    uploadTargetRef.current = productId;
    uploadRef.current?.click();
  }

  return (
    <main className="space-y-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">Retail products</h1>
        <p className="text-muted">
          Track salon products for sale. Photos appear on the salon display Products tab —
          upload from camera or gallery, or generate with AI.
        </p>
      </div>

      {message ? <p className="text-sm text-champagne">{message}</p> : null}

      {/* No capture= — mobile OS offers Camera or Photos/Gallery. */}
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          const id = uploadTargetRef.current;
          e.target.value = "";
          if (file && id) void uploadPhoto(id, file);
        }}
      />

      <form
        onSubmit={addProduct}
        className="grid gap-3 rounded-2xl border border-ink/10 bg-cream p-4 sm:grid-cols-5"
      >
        <input
          required
          name="name"
          placeholder="Product name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2 sm:col-span-2"
        />
        <input
          name="sku"
          placeholder="SKU"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2"
        />
        <input
          name="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2"
          placeholder="Price"
        />
        <div className="flex gap-2">
          <input
            type="number"
            name="stockQty"
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
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-ink/10 bg-ink/5">
                {p.hasImage && p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted">
                  {p.sku || "No SKU"} · {formatCad(p.priceCents)} · stock {p.stockQty}
                  {!p.active && " · inactive"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                className="w-20 rounded-lg border border-ink/15 px-2 py-1 text-sm"
                defaultValue={p.stockQty}
                onBlur={(e) => save(p, { stockQty: Number(e.target.value) })}
              />
              <input
                className="w-24 rounded-lg border border-ink/15 px-2 py-1 text-sm"
                defaultValue={(p.priceCents / 100).toFixed(2)}
                onBlur={(e) => {
                  if (e.target.value) save(p, { price: e.target.value });
                }}
              />
              <button
                type="button"
                disabled={busyId === p.id}
                onClick={() => pickUpload(p.id)}
                className="admin-pill px-3 py-1.5 text-sm disabled:opacity-60"
                data-testid={`product-upload-image-${p.id}`}
              >
                {busyId === p.id ? "Uploading…" : "Upload image"}
              </button>
              <button
                type="button"
                disabled={busyId === p.id}
                onClick={() => void generateImage(p.id)}
                className="admin-pill px-3 py-1.5 text-sm disabled:opacity-60"
                data-testid={`product-generate-image-${p.id}`}
              >
                {busyId === p.id ? "Working…" : p.hasImage ? "AI again" : "AI image"}
              </button>
              <button
                type="button"
                onClick={() => save(p, { active: !p.active })}
                className="admin-pill px-3 py-1.5 text-sm"
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
