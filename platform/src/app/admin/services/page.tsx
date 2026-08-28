"use client";

import { useEffect, useState } from "react";
import { formatCad } from "@/lib/money";
import { SettingToggle } from "@/components/admin/SettingToggle";

type Service = {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  priceCents: number;
  active: boolean;
  stylistCount?: number;
  hasImage?: boolean;
  imageUrl?: string | null;
};

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("WOMEN");
  const [durationMin, setDurationMin] = useState(45);
  const [price, setPrice] = useState("20");
  const [generateImageOnAdd, setGenerateImageOnAdd] = useState(true);
  const [message, setMessage] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/services");
    if (res.status === 401) {
      window.location.href = "/manager/login";
      return;
    }
    const data = await res.json();
    setServices(data.services || []);
  }

  async function syncStylists() {
    const res = await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "syncStylists" }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? `Linked services to stylists (${data.linked ?? 0} new links). Online booking can continue.`
        : "Could not sync stylists"
    );
    await load();
  }

  useEffect(() => {
    load();
  }, []);

  async function generateImage(serviceId: string) {
    setBusyId(serviceId);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/services/${serviceId}/generate-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Could not generate image");
        return;
      }
      setMessage(`AI image ready for ${data.service?.name || "service"}.`);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function addService(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nextName = String(fd.get("name") || name).trim();
    const nextCategory = String(fd.get("category") || category);
    const nextDuration = Number(fd.get("durationMin") || durationMin);
    const nextPrice = String(fd.get("price") || price);
    if (!nextName) {
      setMessage("Name is required");
      return;
    }
    setAdding(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nextName,
          category: nextCategory,
          durationMin: nextDuration,
          price: nextPrice,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(data.error || "Could not add service");
        return;
      }
      setName("");
      const createdId = data.service?.id as string | undefined;
      // Show the new service immediately — do not wait on AI image generation.
      await load();
      if (generateImageOnAdd && createdId) {
        await generateImage(createdId);
      }
    } finally {
      setAdding(false);
    }
  }

  async function toggleActive(s: Service) {
    await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, active: !s.active }),
    });
    await load();
  }

  async function updatePrice(s: Service, nextPrice: string) {
    await fetch("/api/admin/services", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: s.id, price: nextPrice }),
    });
    await load();
  }

  return (
    <main className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl">Services & prices</h1>
          <p className="text-muted">
            New services are offered by all stylists automatically so online booking can continue.
            AI images appear on the store display Services tab.
          </p>
        </div>
        <button
          type="button"
          onClick={syncStylists}
          className="rounded-full border border-ink/20 px-4 py-2 text-sm"
        >
          Fix: link all services → stylists
        </button>
      </div>

      {message ? <p className="text-sm text-champagne">{message}</p> : null}

      <form
        onSubmit={addService}
        className="grid gap-3 rounded-2xl border border-ink/10 bg-cream p-4 sm:grid-cols-5"
      >
        <input
          required
          name="name"
          placeholder="Service name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2 sm:col-span-2"
        />
        <select
          name="category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2"
        >
          <option value="WOMEN">Women</option>
          <option value="MEN">Men</option>
          <option value="OTHER">Other</option>
        </select>
        <input
          type="number"
          name="durationMin"
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          className="rounded-xl border border-ink/15 px-3 py-2"
          placeholder="Minutes"
        />
        <div className="flex gap-2">
          <input
            name="price"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-xl border border-ink/15 px-3 py-2"
            placeholder="Price"
          />
          <button type="submit" disabled={adding} className="btn-solid rounded-full px-4 disabled:opacity-60">
            {adding ? "…" : "Add"}
          </button>
        </div>
        <SettingToggle
          label="Generate AI menu image after adding (stored on this service)"
          checked={generateImageOnAdd}
          onChange={setGenerateImageOnAdd}
        />
      </form>

      <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-cream">
        {services.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-ink/10 bg-ink/5">
                {s.hasImage && s.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-muted">
                    No image
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium">{s.name}</p>
                <p className="text-sm text-muted">
                  {s.category} · {s.durationMin} min · {formatCad(s.priceCents)}
                  {typeof s.stylistCount === "number"
                    ? ` · ${s.stylistCount} stylist${s.stylistCount === 1 ? "" : "s"}`
                    : ""}
                  {s.stylistCount === 0 ? " · not bookable online yet" : ""}
                  {!s.active && " · inactive"}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className="w-24 rounded-lg border border-ink/15 px-2 py-1 text-sm"
                defaultValue={(s.priceCents / 100).toFixed(2)}
                onBlur={(e) => {
                  if (e.target.value) updatePrice(s, e.target.value);
                }}
              />
              <button
                type="button"
                disabled={busyId === s.id}
                onClick={() => void generateImage(s.id)}
                className="rounded-full border border-ink/20 px-3 py-1 text-sm disabled:opacity-60"
                data-testid={`service-generate-image-${s.id}`}
              >
                {busyId === s.id ? "Generating…" : s.hasImage ? "Regenerate AI image" : "Generate AI image"}
              </button>
              <button
                type="button"
                onClick={() => toggleActive(s)}
                className="rounded-full border border-ink/20 px-3 py-1 text-sm"
              >
                {s.active ? "Disable" : "Enable"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
