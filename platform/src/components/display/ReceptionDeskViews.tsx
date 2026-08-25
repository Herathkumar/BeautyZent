"use client";

import { formatCad } from "@/lib/money";
import {
  formatClock,
  initials,
  specialtyFromBio,
  statusLabel,
  type DisplayAppt,
  type DisplayStylist,
} from "@/lib/display-schedule";

export type ReceptionSection =
  | "calendar"
  | "clients"
  | "staff"
  | "services"
  | "products"
  | "reports";

export const RECEPTION_NAV_ITEMS: { id: ReceptionSection; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "clients", label: "Clients" },
  { id: "staff", label: "Staff" },
  { id: "services", label: "Services" },
  { id: "products", label: "Products" },
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
}: {
  stylists: DisplayStylist[];
  appointments: DisplayAppt[];
  query: string;
  timeZone?: string | null;
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
      return { stylist: s, jobs, next };
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
          {rows.map(({ stylist, jobs, next }) => (
            <li
              key={stylist.id}
              className="rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] p-4"
            >
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={stylist.photoUrl || "/avatars/stylist-neutral.svg"}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover ring-2 ring-[color:var(--rx-line)]"
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
}: {
  today: DisplayAppt[];
  waitlist: number;
  futureCount: number;
}) {
  const online = today.filter((a) => (a.source || "ONLINE") !== "WALK_IN").length;
  const walkIn = today.filter((a) => a.source === "WALK_IN").length;
  const booked = today.filter((a) => a.status === "BOOKED").length;
  const inChair = today.filter((a) => a.status === "CHECKED_IN").length;
  const completed = today.filter((a) => a.status === "COMPLETED");
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
    <div className="flex h-full min-h-0 flex-col overflow-auto" data-testid="reception-reports-view">
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
      {completed.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {completed.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--rx-line)] bg-[var(--rx-panel)] px-4 py-3"
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
                {formatCad((a.chargedCents || a.service.priceCents || 0) + (a.tipCents || 0))}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
