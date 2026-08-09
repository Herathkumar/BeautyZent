"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { DisplayPinPad } from "@/components/DisplayPinPad";
import { WalkInPanel } from "@/components/WalkInPanel";
import { ZentraLabFooter } from "@/components/ZentraLabFooter";
import { formatCad } from "@/lib/money";
import { promptCompleteAmounts } from "@/lib/pay";

type Appt = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source?: string;
  notes: string | null;
  chargedCents?: number | null;
  tipCents?: number | null;
  client: { name: string; phone: string | null };
  service: { name: string; priceCents?: number };
  stylist: { name: string; color: string };
};

type SalonInfo = {
  name: string;
  slug: string;
  phone?: string | null;
  address?: string | null;
  timezone?: string | null;
  today?: string | null;
};

type Tab = "today" | "future" | "services" | "products";

type MenuService = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  durationMin: number;
  priceCents: number;
  hasImage?: boolean;
  imageUrl?: string | null;
};

type MenuProduct = {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  priceCents: number;
  stockQty: number;
  hasImage?: boolean;
  imageUrl?: string | null;
};

/** Calendar YYYY-MM-DD in the salon timezone (falls back to local). */
function dayKey(iso: string, timeZone?: string | null) {
  if (timeZone) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(iso));
  }
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function todayKey(timeZone?: string | null, salonToday?: string | null) {
  if (salonToday) return salonToday;
  return dayKey(new Date().toISOString(), timeZone);
}

function dayLabel(key: string, timeZone?: string | null, salonToday?: string | null) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const tKey = todayKey(timeZone, salonToday);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = dayKey(tomorrow.toISOString(), timeZone);

  const formatted = date.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  if (key === tKey) return `Today · ${formatted}`;
  if (key === tomorrowKey) return `Tomorrow · ${formatted}`;
  return formatted;
}

const STATUS_STYLES: Record<string, string> = {
  BOOKED: "bg-[#3d2b22] text-[#f0c987]",
  CHECKED_IN: "bg-[#2a4a3a] text-[#9fe3b8]",
  COMPLETED: "bg-white/10 text-white/60",
  CANCELLED: "bg-white/10 text-red-200/80",
  NO_SHOW: "bg-[#3d2b22] text-[#f0c987]",
};

function AppointmentActions({
  a,
  onStatus,
}: {
  a: Appt;
  onStatus: (id: string, status: string, chargedCents?: number, tipCents?: number) => void;
}) {
  const confirm = useConfirm();
  if (["COMPLETED", "CANCELLED", "NO_SHOW"].includes(a.status)) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {a.status === "BOOKED" && (
        <button
          type="button"
          onClick={() => onStatus(a.id, "CHECKED_IN")}
          className="rounded-full bg-[#c9a87c] px-3 py-2 text-sm font-medium text-[#1c1714]"
        >
          Check in
        </button>
      )}
      {["BOOKED", "CHECKED_IN"].includes(a.status) && (
        <button
          type="button"
          onClick={() => {
            const amounts = promptCompleteAmounts(a.service.priceCents || 0);
            if (!amounts) return;
            onStatus(a.id, "COMPLETED", amounts.chargedCents, amounts.tipCents);
          }}
          className="rounded-full border border-white/30 px-3 py-2 text-sm"
        >
          Done
        </button>
      )}
      {["BOOKED", "CHECKED_IN"].includes(a.status) && (
        <button
          type="button"
          onClick={() => {
            void confirm({
              title: "Mark as no-show?",
              message: "This booking will be marked as a no-show.",
              confirmLabel: "Mark no-show",
              cancelLabel: "Keep booking",
              tone: "danger",
            }).then((ok) => {
              if (ok) onStatus(a.id, "NO_SHOW");
            });
          }}
          className="rounded-full border border-[#c9a87c]/50 px-3 py-2 text-sm text-[#f0c987]"
        >
          No show
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          void confirm({
            title: "Cancel booking?",
            message: "This appointment will be cancelled.",
            confirmLabel: "Cancel booking",
            cancelLabel: "Keep it",
            tone: "danger",
          }).then((ok) => {
            if (ok) onStatus(a.id, "CANCELLED");
          });
        }}
        className="rounded-full border border-red-300/40 px-3 py-2 text-sm text-red-200"
      >
        Cancel
      </button>
    </div>
  );
}

function StylistLine({ a }: { a: Appt }) {
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-center gap-x-2 text-white/80">
        <span>{a.service.name}</span>
        <span className="text-white/40">·</span>
        <span className="inline-flex items-center gap-1.5 font-bold text-[#f0c987]">
          <span
            className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-[#f0c987]/50"
            style={{ background: a.stylist.color }}
            aria-hidden
          />
          {a.stylist.name}
        </span>
      </p>
      {a.notes ? (
        <p className="rounded-lg bg-black/25 px-2.5 py-1.5 text-sm text-[#f0c987]/95">
          <span className="font-semibold text-white/70">Note: </span>
          {a.notes}
        </p>
      ) : null}
    </div>
  );
}

const MENU_SLIDE_MS = 7000;
/** Desktop (lg+): 5 services / column. Phone: 3 — Women+Men stack and only ~3 rows fit. */
const MENU_PAGE_SIZE_DESKTOP = 5;
const MENU_PAGE_SIZE_MOBILE = 3;
/** Desktop: 10 (5+5 columns). Phone: 5 in one column (two columns were stacking and clipping). */
const PRODUCT_PAGE_SIZE_DESKTOP = 10;
const PRODUCT_PAGE_SIZE_MOBILE = 5;

function useIsLgUp() {
  const [isLg, setIsLg] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsLg(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isLg;
}

function ServiceMenuColumn({
  label,
  items,
}: {
  label: string;
  items: MenuService[];
}) {
  const isLg = useIsLgUp();
  const pageSize = isLg ? MENU_PAGE_SIZE_DESKTOP : MENU_PAGE_SIZE_MOBILE;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [items.length, label, pageSize]);

  useEffect(() => {
    if (pageCount <= 1) return;
    const id = window.setInterval(() => {
      setPage((p) => (p + 1) % pageCount);
    }, MENU_SLIDE_MS);
    return () => window.clearInterval(id);
  }, [pageCount]);

  const pages = useMemo(() => {
    const chunks: MenuService[][] = [];
    for (let i = 0; i < items.length; i += pageSize) {
      chunks.push(items.slice(i, i + pageSize));
    }
    return chunks.length ? chunks : [[]];
  }, [items, pageSize]);

  // Absolute slides need a real height; embedded boards (stylist/manager) often have no flex height.
  const viewportMinH = `calc(${pageSize} * 4.25rem)`;

  return (
    <section className="flex min-h-0 min-w-0 flex-col rounded-3xl border border-[#c9a87c]/20 bg-[#1c1714]/55 px-3 py-3 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-md sm:px-4 sm:py-4">
      <div className="mb-2 flex items-baseline justify-between gap-2 border-b border-[#c9a87c]/20 pb-2">
        <h3 className="font-[family-name:var(--font-display)] text-xl text-[#f0c987] sm:text-2xl">
          {label}
        </h3>
        <span className="text-[10px] tracking-[0.18em] text-white/40 uppercase">
          {items.length} services
          {pageCount > 1 ? ` · ${page + 1}/${pageCount}` : ""}
        </span>
      </div>

      <div className="relative flex-1 overflow-hidden" style={{ minHeight: viewportMinH }}>
        {pages.map((pageItems, pageIndex) => (
          <ul
            key={`${label}-page-${pageIndex}`}
            className="absolute inset-0 flex flex-col justify-evenly overflow-hidden px-0.5 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translate3d(${(pageIndex - page) * 100}%, 0, 0)` }}
            aria-hidden={pageIndex !== page}
          >
            {Array.from({ length: pageSize }).map((_, slot) => {
              const s = pageItems[slot];
              if (!s) {
                return <li key={`empty-${slot}`} className="h-[4.25rem] sm:h-[4.75rem]" aria-hidden />;
              }
              return (
                <li
                  key={s.id}
                  className="group flex h-[4.25rem] items-center gap-3 sm:h-[4.75rem] sm:gap-3.5"
                  data-testid={`display-service-${s.id}`}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-[#c9a87c]/35 sm:h-14 sm:w-14">
                    {s.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={s.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#2a211c] text-[10px] text-white/35">
                        •
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex w-full items-baseline gap-2">
                      <h4 className="min-w-0 truncate font-[family-name:var(--font-display)] text-base leading-tight text-[#fffaf6] sm:text-lg">
                        {s.name}
                      </h4>
                      <span
                        className="min-w-[1rem] flex-1 border-b border-dotted border-white/20"
                        aria-hidden
                      />
                      <p className="shrink-0 pr-0.5 text-right font-[family-name:var(--font-display)] text-base font-medium tracking-wide text-[#f0c987] tabular-nums sm:text-lg">
                        {formatCad(s.priceCents)}
                      </p>
                    </div>
                    <p className="mt-0.5 text-[11px] text-white/45 sm:text-xs">
                      {s.durationMin} min
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        ))}
      </div>

      {pageCount > 1 ? (
        <div className="mt-2 flex items-center justify-center gap-2">
          {pages.map((_, i) => (
            <button
              key={`${label}-dot-${i}`}
              type="button"
              aria-label={`Show ${label} page ${i + 1}`}
              onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition ${
                i === page ? "w-5 bg-[#f0c987]" : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function ProductMenuRow({ item }: { item: MenuProduct | undefined }) {
  if (!item) {
    return <li className="h-[4.25rem] sm:h-[4.75rem]" aria-hidden />;
  }
  return (
    <li
      className="group flex h-[4.25rem] items-center gap-3 sm:h-[4.75rem] sm:gap-3.5"
      data-testid={`display-product-${item.id}`}
    >
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full ring-1 ring-[#c9a87c]/35 sm:h-14 sm:w-14">
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[#2a211c] text-[10px] text-white/35">
            •
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex w-full items-baseline gap-2">
          <h4 className="min-w-0 truncate font-[family-name:var(--font-display)] text-base leading-tight text-[#fffaf6] sm:text-lg">
            {item.name}
          </h4>
          <span
            className="min-w-[1rem] flex-1 border-b border-dotted border-white/20"
            aria-hidden
          />
          <p className="shrink-0 pr-0.5 text-right font-[family-name:var(--font-display)] text-base font-medium tracking-wide text-[#f0c987] tabular-nums sm:text-lg">
            {formatCad(item.priceCents)}
          </p>
        </div>
        <p className="mt-0.5 text-[11px] text-white/45 sm:text-xs">
          {item.sku ? `${item.sku} · ` : ""}
          {item.stockQty > 0 ? "In stock" : "Ask stylist"}
        </p>
      </div>
    </li>
  );
}

function ProductMenuBoard({ items }: { items: MenuProduct[] }) {
  const isLg = useIsLgUp();
  const pageSize = isLg ? PRODUCT_PAGE_SIZE_DESKTOP : PRODUCT_PAGE_SIZE_MOBILE;
  const colSize = isLg ? 5 : pageSize;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [items.length, pageSize]);

  useEffect(() => {
    if (pageCount <= 1) return;
    const id = window.setInterval(() => {
      setPage((p) => (p + 1) % pageCount);
    }, MENU_SLIDE_MS);
    return () => window.clearInterval(id);
  }, [pageCount]);

  const pages = useMemo(() => {
    const chunks: MenuProduct[][] = [];
    for (let i = 0; i < items.length; i += pageSize) {
      chunks.push(items.slice(i, i + pageSize));
    }
    return chunks.length ? chunks : [[]];
  }, [items, pageSize]);

  const viewportMinH = `calc(${colSize} * 4.25rem + 1.5rem)`;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-[10px] tracking-[0.18em] text-white/40 uppercase">
          {items.length} products
          {pageCount > 1 ? ` · ${page + 1}/${pageCount}` : ""}
        </p>
      </div>
      <div
        className="relative flex-1 overflow-hidden rounded-3xl border border-[#c9a87c]/20 bg-[#1c1714]/55 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-md"
        style={{ minHeight: viewportMinH }}
      >
        <div className="absolute inset-0 overflow-hidden">
          {pages.map((pageItems, pageIndex) => {
            const left = pageItems.slice(0, colSize);
            const right = isLg ? pageItems.slice(colSize, colSize * 2) : [];
            return (
              <div
                key={`products-page-${pageIndex}`}
                className={`absolute inset-0 grid overflow-hidden px-3 py-3 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-4 sm:py-4 ${
                  isLg ? "grid-cols-2 gap-6" : "grid-cols-1"
                }`}
                style={{ transform: `translate3d(${(pageIndex - page) * 100}%, 0, 0)` }}
                aria-hidden={pageIndex !== page}
              >
                <ul className="flex h-full min-w-0 flex-col justify-evenly overflow-hidden">
                  {Array.from({ length: colSize }).map((_, i) => (
                    <ProductMenuRow key={`L-${pageIndex}-${i}`} item={left[i]} />
                  ))}
                </ul>
                {isLg ? (
                  <ul className="flex h-full min-w-0 flex-col justify-evenly overflow-hidden">
                    {Array.from({ length: colSize }).map((_, i) => (
                      <ProductMenuRow key={`R-${pageIndex}-${i}`} item={right[i]} />
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      {pageCount > 1 ? (
        <div className="mt-2 flex items-center justify-center gap-2">
          {pages.map((_, i) => (
            <button
              key={`products-dot-${i}`}
              type="button"
              aria-label={`Show products page ${i + 1}`}
              onClick={() => setPage(i)}
              className={`h-1.5 rounded-full transition ${
                i === page ? "w-5 bg-[#f0c987]" : "w-1.5 bg-white/30 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function DisplayBoard({
  slug,
  /** When true, board sits inside manager chrome (not the tablet URL). */
  embedded = false,
}: {
  slug: string;
  embedded?: boolean;
}) {
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [services, setServices] = useState<MenuService[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [salon, setSalon] = useState<SalonInfo | null>(null);
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState<Tab>("today");
  const [now, setNow] = useState(() => new Date());
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [walkInWaiting, setWalkInWaiting] = useState(0);
  const [needsPin, setNeedsPin] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [unlockChecked, setUnlockChecked] = useState(false);

  const onWaitlistChange = useCallback((count: number) => {
    setWalkInWaiting(count);
  }, []);

  const checkUnlock = useCallback(async () => {
    try {
      const res = await fetch(`/api/display/${slug}/unlock`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (data.salon) setSalon((prev) => ({ ...(prev || { name: "", slug }), ...data.salon }));
      setPinSet(Boolean(data.pinSet));
      setNeedsPin(Boolean(data.needsPin));
      return !data.needsPin;
    } catch {
      setNeedsPin(false);
      setPinSet(false);
      return true;
    } finally {
      setUnlockChecked(true);
    }
  }, [slug]);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/display/${slug}/today?days=${days}`, {
        credentials: "same-origin",
      });
      const data = await r.json();
      if (r.status === 401 && data.needsPin) {
        setNeedsPin(true);
        return;
      }
      setAppointments(data.appointments || []);
      if (data.salon) setSalon(data.salon);
    } catch {
      /* ignore transient poll errors */
    }
  }, [slug, days]);

  const loadServices = useCallback(async () => {
    try {
      const r = await fetch(`/api/display/${slug}/services`, {
        credentials: "same-origin",
      });
      const data = await r.json();
      if (r.status === 401 && data.needsPin) {
        setNeedsPin(true);
        return;
      }
      setServices(data.services || []);
    } catch {
      /* ignore */
    }
  }, [slug]);

  const loadProducts = useCallback(async () => {
    try {
      const r = await fetch(`/api/display/${slug}/products`, {
        credentials: "same-origin",
      });
      const data = await r.json();
      if (r.status === 401 && data.needsPin) {
        setNeedsPin(true);
        return;
      }
      setProducts(data.products || []);
    } catch {
      /* ignore */
    }
  }, [slug]);

  useEffect(() => {
    void checkUnlock();
  }, [checkUnlock]);

  useEffect(() => {
    if (!unlockChecked || needsPin) return;
    void load();
    void loadServices();
    void loadProducts();
    const poll = setInterval(() => {
      void load();
      if (tab === "services") void loadServices();
      if (tab === "products") void loadProducts();
    }, 15000);
    const clock = setInterval(() => setNow(new Date()), 30000);
    return () => {
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [load, loadServices, loadProducts, unlockChecked, needsPin, tab]);

  useEffect(() => {
    if (!unlockChecked || needsPin) return;
    if (tab === "services") void loadServices();
    if (tab === "products") void loadProducts();
  }, [tab, unlockChecked, needsPin, loadServices, loadProducts]);

  const tKey = todayKey(salon?.timezone, salon?.today);
  /** Floor list: open bookings only — hide completed / no-show / cancelled */
  const todayAppts = useMemo(
    () =>
      appointments.filter(
        (a) =>
          dayKey(a.startsAt, salon?.timezone) === tKey &&
          (a.status === "BOOKED" || a.status === "CHECKED_IN")
      ),
    [appointments, tKey, salon?.timezone]
  );
  const futureGrouped = useMemo(() => {
    const map = new Map<string, Appt[]>();
    for (const a of appointments) {
      const key = dayKey(a.startsAt, salon?.timezone);
      if (key === tKey) continue;
      if (a.status === "COMPLETED" || a.status === "NO_SHOW") continue;
      const list = map.get(key) || [];
      list.push(a);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [appointments, tKey, salon?.timezone]);
  const futureCount = useMemo(
    () => futureGrouped.reduce((n, [, list]) => n + list.length, 0),
    [futureGrouped]
  );
  const servicesByCategory = useMemo(() => {
    const women = services.filter((s) => s.category === "WOMEN");
    const men = services.filter((s) => s.category === "MEN");
    const other = services.filter((s) => s.category !== "WOMEN" && s.category !== "MEN");
    return [
      { key: "WOMEN", label: "Women", items: women },
      { key: "MEN", label: "Men", items: men },
      { key: "OTHER", label: "More", items: other },
    ].filter((g) => g.items.length > 0);
  }, [services]);

  async function setStatus(
    id: string,
    status: string,
    chargedCents?: number,
    tipCents?: number
  ) {
    const res = await fetch(`/api/display/${slug}/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, chargedCents, tipCents }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && data.needsPin) {
      setNeedsPin(true);
      return;
    }
    void load();
  }

  async function lockTablet() {
    await fetch(`/api/display/${slug}/unlock`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    setAppointments([]);
    await checkUnlock();
  }

  const waiting = todayAppts.filter(
    (a) => a.status === "BOOKED" && (a.source || "ONLINE") !== "WALK_IN"
  ).length;
  const inChair = todayAppts.filter((a) => a.status === "CHECKED_IN").length;

  if (!unlockChecked) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center bg-[#1c1714] text-sm text-white/60">
        Loading store display…
      </div>
    );
  }

  if (needsPin && !embedded) {
    return (
      <DisplayPinPad
        slug={slug}
        salonName={salon?.name}
        onUnlocked={() => {
          setNeedsPin(false);
          setUnlockChecked(true);
          void load();
        }}
      />
    );
  }

  if (needsPin && embedded) {
    return (
      <div className="rounded-3xl border border-[#c9a87c]/30 bg-[#2a211c] p-6 text-sm text-[#d4c4b0]">
        Store display PIN is set. Sign in as manager to use the board here, or open the tablet
        URL and enter the PIN.
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col ${
        embedded
          ? "min-h-[70vh] min-w-0 rounded-3xl border border-[#c9a87c]/25"
          : "min-h-screen"
      } bg-[#1c1714] text-[#fffaf6]`}
      data-testid={embedded ? "manager-store-display-board" : "store-display-board"}
    >
      <header className={`border-b border-white/10 ${embedded ? "px-4 py-4 sm:px-5" : "px-6 py-5"}`}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs tracking-[0.2em] text-[#c9a87c] uppercase">
              {embedded ? "Store display" : "Salon floor"}
            </p>
            <h1 className="font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl">
              {salon?.name || "Bookings"}
            </h1>
          </div>
          <div className="flex flex-col items-end gap-2">
            <p className="text-xl text-white/70">
              {now.toLocaleString("en-CA", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </p>
            {!embedded && pinSet ? (
              <button
                type="button"
                onClick={() => void lockTablet()}
                className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white/70 hover:text-white"
              >
                Lock tablet
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-white/15 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setTab("today")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === "today"
                  ? "bg-[#c9a87c] text-[#1c1714]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Today
              <span className="ml-2 opacity-80">({todayAppts.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("future")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === "future"
                  ? "bg-[#c9a87c] text-[#1c1714]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Future
              <span className="ml-2 opacity-80">({futureCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("services")}
              data-testid="display-tab-services"
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === "services"
                  ? "bg-[#c9a87c] text-[#1c1714]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Services
              <span className="ml-2 opacity-80">({services.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("products")}
              data-testid="display-tab-products"
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                tab === "products"
                  ? "bg-[#c9a87c] text-[#1c1714]"
                  : "text-white/70 hover:text-white"
              }`}
            >
              Products
              <span className="ml-2 opacity-80">({products.length})</span>
            </button>
          </div>

          {tab === "future" && (
            <div className="flex items-center gap-2 text-sm text-white/60">
              <span>Range</span>
              <div className="flex rounded-full border border-white/20 p-0.5">
                {[7, 14, 30].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setDays(n)}
                    className={`rounded-full px-3 py-1 ${
                      days === n
                        ? "bg-[#c9a87c] font-medium text-[#1c1714]"
                        : "text-[#fffaf6]/80 hover:bg-white/10"
                    }`}
                  >
                    {n}d
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {tab === "today" && (
        <div className={embedded ? "px-4 py-4 sm:px-5 sm:py-5" : "px-6 py-6"}>
          {/* Promo band */}
          <section className="relative mb-6 overflow-hidden rounded-3xl border border-[#c9a87c]/35 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="absolute inset-0">
              <img
                src="/display-promo.jpg"
                alt=""
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#1c1714]/95 via-[#1c1714]/75 to-[#6e4a38]/45" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(240,201,135,0.35),transparent_45%)]" />
            </div>
            <div className="relative grid gap-5 p-5 sm:gap-6 sm:p-6 md:grid-cols-[minmax(0,1.2fr)_auto] md:items-end md:p-8">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-[0.22em] text-[#f0c987] uppercase">
                  Prefer a set time?
                </p>
                <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl leading-none sm:text-4xl md:text-5xl">
                  Book online
                </h2>
                <p className="mt-3 max-w-xl text-sm text-white/80 sm:text-base md:text-lg">
                  Reserve your favourite stylist ahead of time at{" "}
                  <span className="font-semibold text-[#f0c987]">www.fhsalon.ca</span>
                </p>
                <p className="mt-1.5 max-w-xl text-sm text-white/80 sm:text-base md:text-lg">
                  Walk-ins welcome when a chair is open
                </p>
                {(salon?.phone || salon?.address) && (
                  <p className="mt-3 text-sm text-[#f0c987]/90">
                    {salon.phone}
                    {salon.phone && salon.address ? " · " : ""}
                    {salon.address}
                  </p>
                )}
              </div>
              <div
                className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3 md:min-w-[280px]"
                data-testid="display-floor-counts"
              >
                <div className="rounded-2xl bg-[#f0c987] px-3 py-3 sm:px-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide !text-[#3d2b22]/85 sm:text-xs">
                    Online
                  </p>
                  <p
                    className="font-[family-name:var(--font-display)] text-3xl !text-[#1c1714]"
                    data-testid="display-count-waiting"
                  >
                    {waiting}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight !text-[#3d2b22]/75">
                    Booked ahead
                  </p>
                </div>
                <div className="rounded-2xl bg-[#e8c4a0] px-3 py-3 sm:px-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide !text-[#3d2b22]/85 sm:text-xs">
                    Walk-in
                  </p>
                  <p
                    className="font-[family-name:var(--font-display)] text-3xl !text-[#1c1714]"
                    data-testid="display-count-walk-in"
                  >
                    {walkInWaiting}
                  </p>
                  <p className="mt-0.5 text-[10px] leading-tight !text-[#3d2b22]/75">
                    On waitlist
                  </p>
                </div>
                <div className="rounded-2xl bg-[#9fe3b8] px-3 py-3 sm:px-4">
                  <p className="text-[10px] font-bold uppercase tracking-wide !text-[#0f2a1c]/85 sm:text-xs">
                    In chair
                  </p>
                  <p
                    className="font-[family-name:var(--font-display)] text-3xl !text-[#123022]"
                    data-testid="display-count-in-chair"
                  >
                    {inChair}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* In-store waitlist — under welcome, until seated */}
          <section
            className="mb-6 rounded-3xl border border-[#c9a87c]/30 bg-[#241c18]/80 p-4 md:p-5"
            data-testid="display-waitlist-section"
          >
            <WalkInPanel
              mode="display"
              slug={slug}
              showForm={false}
              showWaitlist
              pollMs={15_000}
              onCreated={load}
              onWaitlistChange={onWaitlistChange}
            />
          </section>

          <section className="mb-6 rounded-3xl border border-[#c9a87c]/30 bg-[#241c18]/80 p-4 md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-[family-name:var(--font-display)] text-2xl">
                  Walk-in desk
                </h2>
                <p className="text-sm text-white/65">
                  Seat a guest now, or add them to the waitlist.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWalkInOpen((v) => !v)}
                className="rounded-full bg-[#c9a87c] px-4 py-2 text-sm font-semibold text-[#1c1714]"
                data-testid="display-walk-in-toggle"
              >
                {walkInOpen ? "Hide form" : "Add walk-in"}
              </button>
            </div>
            {walkInOpen ? (
              <div className="mt-4">
                <WalkInPanel
                  mode="display"
                  slug={slug}
                  showForm
                  showWaitlist={false}
                  onCreated={load}
                />
              </div>
            ) : null}
          </section>

          {/* Today bookings — colourful cards */}
          <div className="grid gap-4">
            {todayAppts.length === 0 && (
              <p className="rounded-2xl border border-dashed border-[#c9a87c]/40 bg-gradient-to-br from-[#3d2b22]/80 to-[#1c1714] p-10 text-center text-white/70">
                No bookings yet today — enjoy a quiet moment, or take a walk-in.
              </p>
            )}
            {todayAppts.map((a, index) => {
              const accents = [
                "from-[#5a3a2a] to-[#2a1c16] border-[#c9a87c]/40",
                "from-[#3a2f4a] to-[#1c1714] border-[#b8a0d8]/35",
                "from-[#2a3f3a] to-[#1c1714] border-[#9fe3b8]/35",
                "from-[#4a3520] to-[#1c1714] border-[#f0c987]/40",
              ];
              const accent = accents[index % accents.length];
              return (
                <article
                  key={a.id}
                  className={`grid gap-3 rounded-2xl border bg-gradient-to-r p-4 shadow-lg md:grid-cols-[160px_1fr_auto] md:items-center ${accent}`}
                >
                  <div>
                    <p className="text-3xl font-semibold tracking-tight">
                      {new Date(a.startsAt).toLocaleTimeString("en-CA", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    <p className="text-sm text-white/55">
                      {new Date(a.endsAt).toLocaleTimeString("en-CA", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-2xl font-semibold">{a.client.name}</p>
                    <StylistLine a={a} />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${
                          STATUS_STYLES[a.status] || STATUS_STYLES.BOOKED
                        }`}
                      >
                        {a.status.replace("_", " ")}
                      </span>
                      {a.source === "WALK_IN" ? (
                        <span
                          data-testid="walk-in-badge"
                          className="inline-block rounded-full bg-[#f0c987]/20 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[#f0c987] uppercase"
                        >
                          Walk-in
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <AppointmentActions a={a} onStatus={setStatus} />
                </article>
              );
            })}
          </div>
        </div>
      )}

      {tab === "future" && (
        <div className="grid gap-8 px-6 py-6">
          {futureGrouped.length === 0 && (
            <p className="rounded-2xl border border-white/10 p-8 text-white/60">
              No upcoming bookings in this range.
            </p>
          )}

          {futureGrouped.map(([key, list]) => (
            <section key={key} className="space-y-3">
              <h2 className="text-sm tracking-[0.16em] text-[#c9a87c] uppercase">
                {dayLabel(key, salon?.timezone, salon?.today)}
              </h2>
              <div className="grid gap-3">
                {list.map((a) => (
                  <article
                    key={a.id}
                    className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 md:grid-cols-[160px_1fr_auto] md:items-center"
                  >
                    <div>
                      <p className="text-2xl font-medium">
                        {new Date(a.startsAt).toLocaleTimeString("en-CA", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                      <p className="text-sm text-white/50">
                        {new Date(a.endsAt).toLocaleTimeString("en-CA", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xl font-medium">{a.client.name}</p>
                      <StylistLine a={a} />
                      <p className="mt-1 text-xs tracking-wide text-[#c9a87c] uppercase">
                        {a.status}
                      </p>
                    </div>
                    <AppointmentActions a={a} onStatus={setStatus} />
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tab === "services" && (
        <div
          className="relative flex min-h-[28rem] flex-1 flex-col overflow-hidden sm:min-h-[32rem]"
          data-testid="display-services-section"
        >
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/display-promo.jpg"
              alt=""
              className="h-full w-full scale-105 object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1c1714]/92 via-[#1c1714]/88 to-[#1c1714]/96" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(240,201,135,0.16),transparent_50%)]" />
          </div>

          <div
            className={`relative z-[1] flex min-h-0 flex-1 flex-col ${
              embedded ? "px-4 py-4 sm:px-5" : "px-5 py-4 sm:px-8 sm:py-5"
            }`}
          >
            <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#c9a87c]/25 pb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.28em] text-[#f0c987] uppercase">
                  Farzana Hair Salon
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-none tracking-tight sm:text-4xl">
                  The menu
                </h2>
              </div>
              <p className="max-w-sm text-right text-xs leading-relaxed text-white/60 sm:text-sm">
                Ask your stylist what’s right for you.
                <br className="hidden sm:block" />
                Walk-ins welcome when a chair is open.
              </p>
            </header>

            {servicesByCategory.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white/60 backdrop-blur-sm">
                No active services yet.
              </p>
            ) : (
              <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-2 lg:gap-8">
                {servicesByCategory.map((group) => (
                  <ServiceMenuColumn
                    key={group.key}
                    label={group.label}
                    items={group.items}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "products" && (
        <div
          className="relative flex min-h-[28rem] flex-1 flex-col overflow-hidden sm:min-h-[32rem]"
          data-testid="display-products-section"
        >
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/display-promo.jpg"
              alt=""
              className="h-full w-full scale-105 object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#1c1714]/92 via-[#1c1714]/88 to-[#1c1714]/96" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(240,201,135,0.14),transparent_50%)]" />
          </div>

          <div
            className={`relative z-[1] flex min-h-0 flex-1 flex-col ${
              embedded ? "px-4 py-4 sm:px-5" : "px-5 py-4 sm:px-8 sm:py-5"
            }`}
          >
            <header className="mb-4 flex flex-wrap items-end justify-between gap-3 border-b border-[#c9a87c]/25 pb-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold tracking-[0.28em] text-[#f0c987] uppercase">
                  Farzana Hair Salon
                </p>
                <h2 className="mt-1 font-[family-name:var(--font-display)] text-3xl leading-none tracking-tight sm:text-4xl">
                  Retail
                </h2>
              </div>
              <p className="max-w-sm text-right text-xs leading-relaxed text-white/60 sm:text-sm">
                Take home the same care we use in the chair.
                <br className="hidden sm:block" />
                Ask your stylist what’s best for your hair.
              </p>
            </header>

            {products.length === 0 ? (
              <p className="rounded-2xl border border-white/10 bg-black/20 p-6 text-white/60 backdrop-blur-sm">
                No retail products listed yet.
              </p>
            ) : (
              <ProductMenuBoard items={products} />
            )}
          </div>
        </div>
      )}

      <ZentraLabFooter
        compact={tab === "services" || tab === "products"}
        className={
          tab === "services" || tab === "products"
            ? "relative z-[1] !mt-0 border-[#c9a87c]/15 !py-2.5 text-[11px] [&_.zentralab-footer-meta]:hidden"
            : undefined
        }
      />
    </div>
  );
}
