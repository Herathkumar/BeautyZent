"use client";

import { useEffect, useState } from "react";
import { formatCad } from "@/lib/money";

type Service = {
  id: string;
  name: string;
  category: string;
  durationMin: number;
  priceCents: number;
  active: boolean;
  stylistCount?: number;
};

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("WOMEN");
  const [durationMin, setDurationMin] = useState(45);
  const [price, setPrice] = useState("40");
  const [message, setMessage] = useState("");

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

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/admin/services", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, category, durationMin, price }),
    });
    setName("");
    await load();
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

      <form onSubmit={addService} className="grid gap-3 rounded-2xl border border-ink/10 bg-cream p-4 sm:grid-cols-5">
        <input
          required
          placeholder="Service name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-ink/15 px-3 py-2 sm:col-span-2"
        />
        <select
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
          value={durationMin}
          onChange={(e) => setDurationMin(Number(e.target.value))}
          className="rounded-xl border border-ink/15 px-3 py-2"
          placeholder="Minutes"
        />
        <div className="flex gap-2">
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-xl border border-ink/15 px-3 py-2"
            placeholder="Price"
          />
          <button type="submit" className="btn-solid rounded-full px-4">
            Add
          </button>
        </div>
      </form>

      <div className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-cream">
        {services.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
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
            <div className="flex items-center gap-2">
              <input
                className="w-24 rounded-lg border border-ink/15 px-2 py-1 text-sm"
                defaultValue={(s.priceCents / 100).toFixed(2)}
                onBlur={(e) => {
                  if (e.target.value) updatePrice(s, e.target.value);
                }}
              />
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
