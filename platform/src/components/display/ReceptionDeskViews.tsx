"use client";

import { useState } from "react";
import { formatCad } from "@/lib/money";
import {
  formatClock,
  initials,
  specialtyFromBio,
  statusLabel,
  stylistFloorTone,
  stylistStatusRingClass,
  stylistWaitInfo,
  type DisplayAppt,
  type DisplayStylist,
} from "@/lib/display-schedule";

export type ReceptionSection =
  | "calendar"
  | "bookings"
  | "clients"
  | "staff"
  | "services"
  | "products"
  | "reports";

export const RECEPTION_NAV_ITEMS: { id: ReceptionSection; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "bookings", label: "Bookings" },
  { id: "clients", label: "Clients" },
  { id: "staff", label: "Staff" },
  { id: "services", label: "Services" },
  { id: "products", label: "Inventory" },
  { id: "reports", label: "Reports" },
];

export type ReceptionService = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMin: number;
  priceCents: number;
};

export type ReceptionProduct = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  priceCents: number;
  stockQty: number;
};

type ClientRow = {
  key: string;
  name: string;
  phone: string | null;
  email: string | null;
  visitCount: number;
  next: DisplayAppt | null;
  latest: DisplayAppt;
};

export function groupReceptionClients(appointments: DisplayAppt[]): ClientRow[] {
  const map = new Map<string, DisplayAppt[]>();
  for (const a of appointments) {
    const key = a.client.id || a.client.phone || a.client.name;
    const list = map.get(key) || [];
    list.push(a);
    map.set(key, list);
  }
  const rows: ClientRow[] = [];
  for (const [key, list] of map) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
    );
    const open = sorted.find((a) => a.status === "BOOKED" || a.status === "CHECKED_IN") || null;
    const latest = sorted[sorted.length - 1];
    rows.push({
      key,
      name: latest.client.name,
      phone: latest.client.phone,
      email: latest.client.email || null,
      visitCount: latest.client.visitCount || 0,
      next: open,
      latest,
    });
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}

export function ReceptionBookingsView({
  appointments,
  query,
  selectedId,
  onSelect,
  timeZone,
}: {
  appointments: DisplayAppt[];
  query: string;
  selectedId: string | null;
  onSelect: (appt: DisplayAppt) => void;
  timeZone?: string | null;
}) {
  const q = query.trim().toLowerCase();
  const rows = appointments
    .filter((a) => a.status === "BOOKED" || a.status === "CHECKED_IN")
    .filter((a) => {
      if (!q) return true;
      return (
        a.client.name.toLowerCase().includes(q) ||
        a.service.name.toLowerCase().includes(q) ||
        a.stylist.name.toLowerCase().includes(q) ||
        (a.client.phone || "").includes(q)
      );
    })
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const groups: { key: string; label: string; items: DisplayAppt[] }[] = [];
  for (const a of rows) {
    const key = new Date(a.startsAt).toLocaleDateString("en-CA", {
      timeZone: timeZone || undefined,
    });
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(a);
    } else {
      groups.push({
        key,
        label: new Date(a.startsAt).toLocaleDateString("en-CA", {
          timeZone: timeZone || undefined,
          weekday: "long",
          month: "short",
          day: "numeric",
        }),
        items: [a],
      });
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="reception-bookings-view">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[color:var(--rx-text)]">Bookings</h2>
        <p className="text-[11px] text-[color:var(--rx-faint)]">
          Open visits on the book. Select one to check in, reschedule, or check out.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] px-4 py-8 text-center text-sm text-[color:var(--rx-faint)]">
          {q ? "No bookings match that search." : "No open bookings in this range."}
        </p>
      ) : (
        <div className="min-h-0 flex-1 space-y-4 overflow-auto pr-1">
          {groups.map((g) => (
            <section key={g.key}>
              <h3 className="mb-2 text-[11px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
                {g.label}
              </h3>
              <ul className="space-y-2">
                {g.items.map((a) => {
                  const active = selectedId === a.id;
                  return (
                    <li key={a.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(a)}
                        data-testid="reception-booking-row"
                        data-appt-id={a.id}
                        className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left ${
                          active
                            ? "border-[color:var(--rx-accent)] bg-[var(--rx-panel)]"
                            : "border-[color:var(--rx-line)] bg-[var(--rx-panel)] hover:border-[color:var(--rx-accent)]"
                        }`}
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--rx-accent)] text-xs font-bold text-white">
                          {initials(a.client.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-[color:var(--rx-text)]">
                            {a.client.name}
                          </span>
                          <span className="block truncate text-[11px] text-[color:var(--rx-muted)]">
                            {formatClock(a.startsAt, timeZone)} · {a.service.name} · {a.stylist.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
                          {statusLabel(a.status)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReceptionClientsView({
  clients,
  query,
  selectedId,
  onSelect,
}: {
  clients: ClientRow[];
  query: string;
  selectedId: string | null;
  onSelect: (appt: DisplayAppt) => void;
}) {
  const q = query.trim().toLowerCase();
  const rows = q
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.phone || "").includes(q) ||
          (c.email || "").toLowerCase().includes(q)
      )
    : clients;

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="reception-clients-view">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[color:var(--rx-text)]">Clients</h2>
        <p className="text-[11px] text-[color:var(--rx-faint)]">
          People on the book in this range. Select one to see details.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] px-4 py-8 text-center text-sm text-[color:var(--rx-faint)]">
          {q ? "No clients match that search." : "No clients on the book in this range."}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 space-y-2 overflow-auto pr-1">
          {rows.map((c) => {
            const appt = c.next || c.latest;
            const active = selectedId === appt.id;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  onClick={() => onSelect(appt)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left ${
                    active
                      ? "border-[color:var(--rx-accent)] bg-[var(--rx-panel)]"
                      : "border-[color:var(--rx-line)] bg-[var(--rx-panel)] hover:border-[color:var(--rx-accent)]"
                  }`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--rx-accent)] text-xs font-bold text-white">
                    {initials(c.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[color:var(--rx-text)]">
                      {c.name}
                    </span>
                    <span className="block truncate text-[11px] text-[color:var(--rx-muted)]">
                      {c.next
                        ? `${formatClock(c.next.startsAt)} · ${c.next.service.name} · ${c.next.stylist.name}`
                        : c.phone || c.email || "No upcoming visit"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
                    {c.visitCount || 1} visit{c.visitCount === 1 ? "" : "s"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ReceptionStaffView({
  stylists,
  appointments,
  query,
  timeZone,
  now,
  openHour,
  closeHour,
  storeClosed,
}: {
  stylists: DisplayStylist[];
  appointments: DisplayAppt[];
  query: string;
  timeZone?: string | null;
  now: Date;
  openHour: number;
  closeHour: number;
  storeClosed?: boolean;
}) {
  const q = query.trim().toLowerCase();
  const rows = (q ? stylists.filter((s) => s.name.toLowerCase().includes(q)) : stylists).map(
    (s) => {
      const jobs = appointments.filter(
        (a) => a.stylist.id === s.id || a.stylist.name === s.name
      );
      const next =
        jobs
          .filter((a) => a.status === "BOOKED" || a.status === "CHECKED_IN")
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ||
        null;
      const wait = stylistWaitInfo(
        jobs,
        now,
        openHour,
        closeHour,
        timeZone,
        storeClosed
      );
      return { stylist: s, jobs, next, wait };
    }
  );

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="reception-staff-view">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[color:var(--rx-text)]">Staff on the floor</h2>
        <p className="text-[11px] text-[color:var(--rx-faint)]">
          Today’s chairs and what’s next on each book.
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] px-4 py-8 text-center text-sm text-[color:var(--rx-faint)]">
          No stylists to show.
        </p>
      ) : (
        <ul className="grid min-h-0 flex-1 content-start gap-3 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ stylist, jobs, next, wait }) => (
            <li
              key={stylist.id}
              className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] p-4"
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stylist.photoUrl || "/avatars/stylist-neutral.svg"}
                  alt=""
                  className={`h-12 w-12 rounded-full object-cover ring-offset-2 ring-offset-[var(--rx-panel)] ${stylistStatusRingClass(
                    wait.kind
                  )}`}
                  data-testid="stylist-status-ring"
                  data-status-tone={stylistFloorTone(wait.kind)}
                  title={wait.label}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[color:var(--rx-text)]">
                    {stylist.name}
                  </p>
                  <p className="truncate text-[11px] text-[color:var(--rx-muted)]">
                    {specialtyFromBio(stylist.bio, stylist.name)}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[color:var(--rx-faint)]">
                {jobs.length} {jobs.length === 1 ? "visit" : "visits"} today
              </p>
              <p className="mt-1 text-sm text-[color:var(--rx-text-80)]">
                {next
                  ? `Next: ${formatClock(next.startsAt, timeZone)} · ${next.client.name}`
                  : "No more guests on the book"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReceptionServicesView({
  groups,
  query,
}: {
  groups: { key: string; label: string; items: ReceptionService[] }[];
  query: string;
}) {
  const q = query.trim().toLowerCase();
  const filtered = groups
    .map((g) => ({
      ...g,
      items: q ? g.items.filter((s) => s.name.toLowerCase().includes(q)) : g.items,
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto" data-testid="reception-services-view">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[color:var(--rx-text)]">Service menu</h2>
        <p className="text-[11px] text-[color:var(--rx-faint)]">
          Prices and times for quoting at the desk.
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] px-4 py-8 text-center text-sm text-[color:var(--rx-faint)]">
          No services match that search.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((g) => (
            <section
              key={g.key}
              className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] p-4"
            >
              <h3 className="mb-3 text-xs font-semibold tracking-[0.16em] text-[color:var(--rx-accent-soft)] uppercase">
                {g.label}
              </h3>
              <ul className="divide-y divide-[color:var(--rx-line)]">
                {g.items.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[color:var(--rx-text)]">
                        {s.name}
                      </p>
                      <p className="text-[11px] text-[color:var(--rx-faint)]">{s.durationMin} min</p>
                    </div>
                    <p className="shrink-0 text-sm tabular-nums text-[color:var(--rx-text-80)]">
                      {formatCad(s.priceCents)}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

export function ReceptionProductsView({
  products,
  query,
}: {
  products: ReceptionProduct[];
  query: string;
}) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      )
    : products;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto" data-testid="reception-products-view">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[color:var(--rx-text)]">Retail</h2>
        <p className="text-[11px] text-[color:var(--rx-faint)]">
          Products to add at checkout or quote at the desk.
        </p>
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] px-4 py-8 text-center text-sm text-[color:var(--rx-faint)]">
          {products.length === 0
            ? "No retail products listed yet."
            : "No products match that search."}
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--rx-line)] rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] px-4">
          {filtered.map((p) => (
            <li key={p.id} className="flex items-baseline justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[color:var(--rx-text)]">{p.name}</p>
                <p className="text-[11px] text-[color:var(--rx-faint)]">
                  {p.sku ? `${p.sku} · ` : ""}
                  {p.stockQty === 1 ? "1 in stock" : `${p.stockQty} in stock`}
                </p>
              </div>
              <p className="shrink-0 text-sm tabular-nums text-[color:var(--rx-text-80)]">
                {formatCad(p.priceCents)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReceptionReportsView({
  today,
  waitlist,
  futureCount,
  timeZone,
}: {
  today: DisplayAppt[];
  waitlist: number;
  futureCount: number;
  timeZone?: string | null;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const online = today.filter((a) => (a.source || "ONLINE") !== "WALK_IN").length;
  const walkIn = today.filter((a) => a.source === "WALK_IN").length;
  const booked = today.filter((a) => a.status === "BOOKED").length;
  const inChair = today.filter((a) => a.status === "CHECKED_IN").length;
  const completed = [...today.filter((a) => a.status === "COMPLETED")].sort(
    (a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
  );
  const selected = completed.find((a) => a.id === selectedId) ?? null;
  const taken = completed.reduce((n, a) => n + (a.chargedCents || a.service.priceCents || 0), 0);
  const tips = completed.reduce((n, a) => n + (a.tipCents || 0), 0);

  const cards = [
    { label: "On the book", value: String(today.length) },
    { label: "Online", value: String(online) },
    { label: "Walk-in", value: String(walkIn) },
    { label: "Waiting", value: String(booked) },
    { label: "In chair", value: String(inChair) },
    { label: "Waitlist", value: String(waitlist) },
    { label: "Completed", value: String(completed.length) },
    { label: "Coming up", value: String(futureCount) },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="reception-reports-view">
      <div className="shrink-0 overflow-auto">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-[color:var(--rx-text)]">Today at a glance</h2>
        <p className="text-[11px] text-[color:var(--rx-faint)]">
          Floor counts for the front desk. Full payroll lives in the manager app.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] px-4 py-4"
          >
            <p className="text-[10px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
              {c.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-[color:var(--rx-text)]">
              {c.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] px-4 py-4">
        <p className="text-[10px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
          Taken today
        </p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-[color:var(--rx-text)]">
          {formatCad(taken)}
        </p>
        <p className="mt-1 text-sm text-[color:var(--rx-muted)]">
          Tips {formatCad(tips)} · {completed.length}{" "}
          {completed.length === 1 ? "completed visit" : "completed visits"}
        </p>
      </div>
      </div>
      {completed.length > 0 ? (
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
          <div className="mb-2 shrink-0">
            <h3 className="text-[11px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
              Completed today
            </h3>
            <p className="text-[11px] text-[color:var(--rx-faint)]">
              {selected ? "Details stay visible while you browse the list." : "Tap a visit for details."}
            </p>
          </div>
          <div
            className={`grid min-h-0 flex-1 gap-3 ${
              selected
                ? "md:grid-cols-[minmax(0,1fr)_minmax(280px,380px)]"
                : "grid-cols-1"
            }`}
          >
            <ul className="min-h-0 space-y-2 overflow-auto pr-1">
              {completed.map((a) => {
                const active = selectedId === a.id;
                const charged = a.chargedCents ?? a.service.priceCents ?? 0;
                const tip = a.tipCents ?? 0;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(active ? null : a.id)}
                      data-testid="reception-report-row"
                      data-appt-id={a.id}
                      className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                        active
                          ? "border-[color:var(--rx-accent)] bg-[var(--rx-panel)] ring-1 ring-[color:var(--rx-accent)]/35"
                          : "border-[color:var(--rx-line)] bg-[var(--rx-panel)] hover:border-[color:var(--rx-accent)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-[color:var(--rx-text)]">
                          {a.client.name}
                        </p>
                        <p className="truncate text-[11px] text-[color:var(--rx-muted)]">
                          {a.service.name} · {a.stylist.name} · {statusLabel(a.status)}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm tabular-nums text-[color:var(--rx-text-80)]">
                        {formatCad(charged + tip)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
            {selected ? (
              <div
                className="fixed inset-0 z-[70] flex items-end justify-center md:static md:z-auto md:block md:min-h-0 md:overflow-auto"
                role="dialog"
                aria-modal="true"
                aria-label="Visit details"
              >
                <button
                  type="button"
                  className="absolute inset-0 border-0 bg-[rgba(28,23,20,0.55)] md:hidden"
                  aria-label="Close visit details"
                  onClick={() => setSelectedId(null)}
                />
                <div className="relative z-10 max-h-[82dvh] w-full overflow-auto rounded-t-2xl border-t border-[color:var(--rx-line)] bg-[var(--rx-bg)] shadow-[0_-18px_40px_rgba(0,0,0,0.35)] md:max-h-none md:rounded-none md:border-0 md:bg-transparent md:shadow-none">
                  <CompletedVisitDetail
                    appt={selected}
                    timeZone={timeZone}
                    onClose={() => setSelectedId(null)}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function reportSourceLabel(source?: string) {
  return source === "WALK_IN" ? "Walk-in" : "Online";
}

function CompletedVisitDetail({
  appt,
  timeZone,
  onClose,
}: {
  appt: DisplayAppt;
  timeZone?: string | null;
  onClose: () => void;
}) {
  const charged = appt.chargedCents ?? appt.service.priceCents ?? 0;
  const tip = appt.tipCents ?? 0;
  const when = new Date(appt.startsAt).toLocaleString("en-CA", {
    timeZone: timeZone || undefined,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <section
      className="rounded-2xl border border-[color:var(--rx-accent)]/35 bg-[var(--rx-panel)] px-4 py-4 md:sticky md:top-0"
      data-testid="reception-report-detail"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--rx-accent)] text-sm font-bold text-white">
            {initials(appt.client.name)}
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[color:var(--rx-text)]">
              {appt.client.name}
            </h3>
            <p className="text-[11px] text-[color:var(--rx-muted)]">{when}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xl leading-none text-[color:var(--rx-faint)] hover:text-[color:var(--rx-text)]"
          aria-label="Close visit details"
        >
          ×
        </button>
      </div>

      <dl className="grid gap-2.5 text-sm">
        <DetailRow label="Service" value={appt.service.name} />
        <DetailRow label="Stylist" value={appt.stylist.name} />
        {appt.service.durationMin ? (
          <DetailRow label="Duration" value={`${appt.service.durationMin} min`} />
        ) : null}
        <DetailRow label="Source" value={reportSourceLabel(appt.source)} />
        <DetailRow label="Status" value={statusLabel(appt.status)} />
        {appt.client.phone ? <DetailRow label="Phone" value={appt.client.phone} /> : null}
        {appt.client.email ? <DetailRow label="Email" value={appt.client.email} /> : null}
        <DetailRow label="Service charge" value={formatCad(charged)} />
        <DetailRow label="Tip" value={formatCad(tip)} />
        <DetailRow label="Total collected" value={formatCad(charged + tip)} strong />
      </dl>

      {appt.notes ? (
        <p className="mt-3 rounded-xl border border-[color:var(--rx-line)] bg-[var(--rx-input)] px-3 py-2 text-[11px] text-[color:var(--rx-muted)]">
          <span className="font-semibold text-[color:var(--rx-text)]">Notes · </span>
          {appt.notes}
        </p>
      ) : null}
    </section>
  );
}

function DetailRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[11px] font-semibold tracking-wide text-[color:var(--rx-faint)] uppercase">
        {label}
      </dt>
      <dd
        className={`text-right text-[color:var(--rx-text)] ${strong ? "font-semibold tabular-nums" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
