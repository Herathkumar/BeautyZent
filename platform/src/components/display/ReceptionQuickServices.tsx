"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCad } from "@/lib/money";

const SLOT_COUNT = 8;
const STORAGE_PREFIX = "rx-quick-services:";

type CatalogItem = { id: string; name: string; priceCents: number };

function emptySlots(): (string | null)[] {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

function readSlots(slug: string): (string | null)[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`${STORAGE_PREFIX}${slug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return Array.from({ length: SLOT_COUNT }, (_, i) =>
      typeof parsed[i] === "string" && parsed[i] ? String(parsed[i]) : null
    );
  } catch {
    return null;
  }
}

function writeSlots(slug: string, slots: (string | null)[]) {
  window.localStorage.setItem(`${STORAGE_PREFIX}${slug}`, JSON.stringify(slots));
}

export function ReceptionQuickServices({
  slug,
  services,
  onAdd,
}: {
  slug: string;
  services: CatalogItem[];
  onAdd: (serviceId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [slots, setSlots] = useState<(string | null)[]>(emptySlots);

  useEffect(() => {
    const saved = readSlots(slug);
    if (saved) {
      setSlots(saved);
      return;
    }
    if (!services.length) return;
    setSlots(
      Array.from({ length: SLOT_COUNT }, (_, i) => services[i]?.id ?? null)
    );
  }, [slug, services]);

  const byId = useMemo(() => new Map(services.map((s) => [s.id, s])), [services]);

  function setSlot(index: number, serviceId: string | null) {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = serviceId;
      writeSlots(slug, next);
      return next;
    });
  }

  return (
    <div data-testid="reception-quick-services">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold tracking-wide text-white/40 uppercase">
          Quick services
        </p>
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-[11px] font-semibold text-[#c45b7a] hover:text-[#e07a96]"
          data-testid="reception-quick-services-edit"
        >
          {editing ? "Done" : "Edit boxes"}
        </button>
      </div>
      <p className="mb-2 text-[11px] text-white/35">
        {editing
          ? "Choose the services this desk uses most. They stay on this tablet."
          : "Tap a box to add it to the bill."}
      </p>

      <div className="grid grid-cols-4 gap-2">
        {slots.map((id, index) => {
          const svc = id ? byId.get(id) : undefined;
          if (editing) {
            return (
              <label key={index} className="block min-h-[4.25rem]">
                <span className="sr-only">Quick service {index + 1}</span>
                <select
                  value={id || ""}
                  onChange={(e) => setSlot(index, e.target.value || null)}
                  className="reception-catalog-select h-full min-h-[4.25rem] w-full rounded-2xl border border-white/12 bg-white/5 px-2 text-left text-[11px] font-semibold text-white/85"
                  data-testid="reception-quick-service-assign"
                >
                  <option value="">Empty</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            );
          }
          if (!svc) {
            return (
              <button
                key={index}
                type="button"
                onClick={() => setEditing(true)}
                className="min-h-[4.25rem] rounded-2xl border border-dashed border-white/15 px-2 text-center text-[11px] text-white/35"
                data-testid="reception-quick-service-empty"
              >
                + Set
              </button>
            );
          }
          return (
            <button
              key={`${svc.id}-${index}`}
              type="button"
              onClick={() => onAdd(svc.id)}
              className="min-h-[4.25rem] rounded-2xl bg-white/5 px-2 py-2 text-center ring-1 ring-white/12 hover:ring-white/30"
              data-testid="reception-quick-service"
              data-service-id={svc.id}
            >
              <span className="line-clamp-2 text-[11px] font-semibold leading-tight text-white/90">
                {svc.name}
              </span>
              <span className="mt-1 block text-[10px] tabular-nums text-white/45">
                {formatCad(svc.priceCents)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
