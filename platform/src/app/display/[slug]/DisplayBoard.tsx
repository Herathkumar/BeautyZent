"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConfirm } from "@/components/ConfirmDialog";
import { DisplayPinPad } from "@/components/DisplayPinPad";
import { PadlockButton } from "@/components/PadlockButton";
import {
  ReceptionNewBookingModal,
  ReceptionWalkInModal,
} from "@/components/display/ReceptionBookingModals";
import { ZentraLabFooter } from "@/components/ZentraLabFooter";
import { CustomerCheckoutOverlay } from "@/components/display/CustomerCheckoutOverlay";
import {
  CustomerPromotionBoard,
  usePromotionBoardCycle,
} from "@/components/display/CustomerPromotionBoard";
import { CustomerScheduleGrid } from "@/components/display/CustomerScheduleGrid";
import { ReceptionCheckoutDesk } from "@/components/display/ReceptionCheckoutDesk";
import {
  groupReceptionClients,
  ReceptionBookingsView,
  ReceptionClientsView,
  ReceptionProductsView,
  ReceptionReportsView,
  ReceptionServicesView,
  ReceptionStaffView,
  RECEPTION_NAV_ITEMS,
  type ReceptionSection,
} from "@/components/display/ReceptionDeskViews";
import { ReceptionRescheduleSheet } from "@/components/display/ReceptionReschedule";
import { ReceptionDailyMetrics } from "@/components/display/ReceptionDailyMetrics";
import { ReceptionClientPanel, ReceptionSchedule } from "@/components/display/ReceptionSchedule";
import { ReceptionThemeRoot } from "@/components/display/ReceptionThemeRoot";
import { ReceptionThemeToggle } from "@/components/display/ReceptionThemeToggle";
import { CustomerThemeRoot } from "@/components/display/CustomerThemeRoot";
import { CustomerThemeToggle } from "@/components/display/CustomerThemeToggle";
import { CustomerViewToggle } from "@/components/display/CustomerViewToggle";
import { CustomerAmbientBackdrop } from "@/components/display/CustomerAmbientBackdrop";
import { CustomerWeatherChip } from "@/components/display/CustomerWeatherChip";
import { CustomerLoungeHeadlineStatus } from "@/components/display/CustomerLoungeHeadlineStatus";
import {
  clampDisplayHours,
  earlySeatWindow,
  formatHourLabel,
  isE2eFixtureStylist,
  type DisplayAppt,
  type DisplayStylist,
} from "@/lib/display-schedule";
import {
  CUSTOMER_VIEW_EVENT,
  customerViewKey,
  normalizeCustomerDisplayView,
  readCustomerDisplayView,
  type CustomerDisplayView,
} from "@/lib/customer-display-view";
import type { CheckoutBill } from "@/lib/display-checkout-types";
import type { PromotionBoardPayload } from "@/lib/promotion-board";
import { addCalendarDays, dayOfWeekInTz } from "@/lib/salon-time";
import { formatCad } from "@/lib/money";
import { promptCompleteAmounts } from "@/lib/pay";
import { humanizeSlug, writeSalonBrand } from "@/lib/salon-branding";

type Appt = DisplayAppt;

type SalonInfo = {
  name: string;
  slug: string;
  phone?: string | null;
  address?: string | null;
  timezone?: string | null;
  today?: string | null;
  openHour?: number;
  closeHour?: number;
  closedDays?: number[];
  todayClosed?: boolean;
  displayViewMode?: string | null;
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

function keepIfSame<T>(prev: T, next: T): T {
  return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
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

const TODAY_POLL_MS = 15_000;
const CHECKOUT_POLL_MS = 5_000;
/** Browser global so Fast Refresh / remounts cannot reset the throttle and stampede. */
const displayPollAt = (globalThis as typeof globalThis & {
  __displayPollAt?: { today: number; checkout: number };
}).__displayPollAt ?? { today: 0, checkout: 0 };
(globalThis as typeof globalThis & {
  __displayPollAt?: { today: number; checkout: number };
}).__displayPollAt = displayPollAt;

export function DisplayBoard({
  slug,
  /** When true, board sits inside manager chrome (not the tablet URL). */
  embedded = false,
  variant = "customer",
  staffName,
  staffRole,
}: {
  slug: string;
  embedded?: boolean;
  variant?: "customer" | "reception";
  staffName?: string;
  staffRole?: string;
}) {
  const [appointments, setAppointments] = useState<Appt[]>([]);
  const [stylists, setStylists] = useState<DisplayStylist[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [services, setServices] = useState<MenuService[]>([]);
  const [products, setProducts] = useState<MenuProduct[]>([]);
  const [salon, setSalon] = useState<SalonInfo | null>(null);
  const [days, setDays] = useState(14);
  const [tab, setTab] = useState<Tab>("today");
  const [now, setNow] = useState(() => new Date());
  const [bookingModal, setBookingModal] = useState<"new" | "walkin" | null>(null);
  const [walkInWaiting, setWalkInWaiting] = useState(0);
  const [query, setQuery] = useState("");
  const [receptionSection, setReceptionSection] = useState<ReceptionSection>("calendar");
  const [scheduleDay, setScheduleDay] = useState("");
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  /** null until this tablet picks a layout; then it wins over the salon default. */
  const [viewOverride, setViewOverride] = useState<CustomerDisplayView | null>(null);
  const [needsPin, setNeedsPin] = useState(false);
  const [pinSet, setPinSet] = useState(false);
  const [unlockChecked, setUnlockChecked] = useState(false);
  /** Public tablet unlock — memory only; refresh clears it and asks for PIN again. */
  const [unlockToken, setUnlockToken] = useState("");
  /** Manager/stylist in-app lock — hides the board until padlock unlock. */
  const [boardLocked, setBoardLocked] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutBill | null>(null);
  const [promoBoard, setPromoBoard] = useState<PromotionBoardPayload | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [checkInError, setCheckInError] = useState("");
  const [statusBusyId, setStatusBusyId] = useState<string | null>(null);
  const checkoutInFlight = useRef(false);
  const checkoutWriteSeq = useRef(0);
  const checkoutLiveRef = useRef(false);
  const hidePaidThanksRef = useRef(false);
  checkoutLiveRef.current = Boolean(checkout && checkout.status !== "PAID") || checkoutBusy;
  const boardDataSeq = useRef(0);
  const receptionSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setViewOverride(readCustomerDisplayView(slug));
    function onViewChange(e: Event) {
      const detail = (e as CustomEvent<{ slug: string; view: CustomerDisplayView }>).detail;
      if (detail?.slug === slug) setViewOverride(detail.view);
    }
    function onStorage(e: StorageEvent) {
      if (e.key !== customerViewKey(slug)) return;
      setViewOverride(readCustomerDisplayView(slug));
    }
    window.addEventListener(CUSTOMER_VIEW_EVENT, onViewChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CUSTOMER_VIEW_EVENT, onViewChange);
      window.removeEventListener("storage", onStorage);
    };
  }, [slug]);

  useEffect(() => {
    if (variant !== "reception") return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        receptionSearchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  const customerView =
    viewOverride ?? normalizeCustomerDisplayView(salon?.displayViewMode);

  const unlockHeaders = useMemo(() => {
    if (!unlockToken) return {} as Record<string, string>;
    return { "x-display-unlock": unlockToken };
  }, [unlockToken]);

  useEffect(() => {
    if (variant !== "reception") return;
    let cancelled = false;
    async function pollWaitlist() {
      const res = await fetch(`/api/display/${slug}/waitlist`, {
        credentials: "same-origin",
        headers: unlockHeaders,
      });
      if (!res.ok || cancelled) return;
      const data = await res.json().catch(() => ({}));
      if (!cancelled) setWalkInWaiting((data.waitlist || []).length);
    }
    void pollWaitlist();
    const timer = window.setInterval(pollWaitlist, TODAY_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [variant, slug, unlockHeaders]);

  const checkUnlock = useCallback(async () => {
    try {
      const q = embedded ? "?mode=embedded" : "";
      const res = await fetch(`/api/display/${slug}/unlock${q}`, {
        credentials: "same-origin",
      });
      const data = await res.json();
      if (data.salon) {
        const nextSalon = {
          name: "",
          ...data.salon,
          slug: data.salon.slug || slug,
        };
        setSalon((prev) => keepIfSame(prev, nextSalon));
        if (nextSalon.name) {
          writeSalonBrand({
            slug: nextSalon.slug || slug,
            name: nextSalon.name,
            address: nextSalon.address ?? null,
          });
        }
      }
      setPinSet(Boolean(data.pinSet));
      // Reception is staff-login gated; skip the waiting-room PIN pad.
      if (variant === "reception" && !embedded) {
        setNeedsPin(false);
        return true;
      }
      // Public customer tablet always needs a fresh PIN after load/refresh (no cookie unlock).
      if (!embedded && data.pinSet) {
        setUnlockToken("");
        setNeedsPin(true);
        return false;
      }
      setNeedsPin(Boolean(data.needsPin));
      return !data.needsPin;
    } catch {
      setNeedsPin(false);
      setPinSet(false);
      return true;
    } finally {
      setUnlockChecked(true);
    }
  }, [slug, embedded, variant]);

  const skipPinLock = variant === "reception" && !embedded;

  const lockToPin = useCallback(() => {
    if (skipPinLock) return;
    setUnlockToken("");
    setNeedsPin(true);
  }, [skipPinLock]);

  const load = useCallback(async () => {
    const seq = ++boardDataSeq.current;
    try {
      const r = await fetch(`/api/display/${slug}/today?days=${days}`, {
        credentials: "same-origin",
        headers: unlockHeaders,
      });
      const data = await r.json();
      if (seq !== boardDataSeq.current) return;
      if (r.status === 401 && data.needsPin) {
        lockToPin();
        return;
      }
      setAppointments((prev) => keepIfSame(prev, data.appointments || []));
      setStylists((prev) => keepIfSame(prev, data.stylists || []));
      if (data.salon) {
        setSalon((prev) => keepIfSame(prev, data.salon));
        if (data.salon.name) {
          writeSalonBrand({
            slug: data.salon.slug || slug,
            name: data.salon.name,
            address: data.salon.address ?? null,
          });
        }
      }
    } catch {
      /* ignore transient poll errors */
    }
  }, [slug, days, unlockHeaders, lockToPin]);

  const loadServices = useCallback(async () => {
    try {
      const r = await fetch(`/api/display/${slug}/services`, {
        credentials: "same-origin",
        headers: unlockHeaders,
      });
      const data = await r.json();
      if (r.status === 401 && data.needsPin) {
        lockToPin();
        return;
      }
      setServices((prev) => keepIfSame(prev, data.services || []));
    } catch {
      /* ignore */
    }
  }, [slug, unlockHeaders, lockToPin]);

  const loadProducts = useCallback(async () => {
    try {
      const r = await fetch(`/api/display/${slug}/products`, {
        credentials: "same-origin",
        headers: unlockHeaders,
      });
      const data = await r.json();
      if (r.status === 401 && data.needsPin) {
        lockToPin();
        return;
      }
      setProducts((prev) => keepIfSame(prev, data.products || []));
    } catch {
      /* ignore */
    }
  }, [slug, unlockHeaders, lockToPin]);

  const loadCheckout = useCallback(async () => {
    if (checkoutInFlight.current) return;
    checkoutInFlight.current = true;
    const seq = checkoutWriteSeq.current;
    try {
      const r = await fetch(`/api/display/${slug}/checkout`, {
        credentials: "same-origin",
        headers: unlockHeaders,
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401 && data.needsPin) {
        lockToPin();
        return;
      }
      if (seq !== checkoutWriteSeq.current) return;
      let next = data.checkout || null;
      if (next && next.status !== "PAID") hidePaidThanksRef.current = false;
      if (hidePaidThanksRef.current && next?.status === "PAID") next = null;
      setCheckout((prev) => keepIfSame(prev, next));
    } catch {
      /* ignore */
    } finally {
      checkoutInFlight.current = false;
    }
  }, [slug, unlockHeaders, lockToPin]);

  const loadPromoBoard = useCallback(async () => {
    try {
      const r = await fetch(`/api/display/${slug}/promotion-board`, {
        credentials: "same-origin",
        headers: unlockHeaders,
      });
      const data = await r.json().catch(() => ({}));
      if (r.status === 401 && data.needsPin) {
        lockToPin();
        return;
      }
      if (!r.ok) return;
      setPromoBoard((prev) => keepIfSame(prev, data as PromotionBoardPayload));
    } catch {
      /* ignore */
    }
  }, [slug, unlockHeaders, lockToPin]);

  async function checkoutAction(body: Record<string, unknown>) {
    const seq = ++checkoutWriteSeq.current;
    const r = await fetch(`/api/display/${slug}/checkout`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...unlockHeaders },
      body: JSON.stringify(body),
    });
    const data = await r.json().catch(() => ({}));
    if (r.status === 401 && data.needsPin) {
      lockToPin();
      return null;
    }
    if (!r.ok) {
      return { error: data.error || "Checkout failed" };
    }
    if (seq !== checkoutWriteSeq.current) return data;
    let next = data.checkout || null;
    if (next && next.status !== "PAID") hidePaidThanksRef.current = false;
    if (hidePaidThanksRef.current && next?.status === "PAID") next = null;
    setCheckout(next);
    return data;
  }

  useEffect(() => {
    void checkUnlock();
  }, [checkUnlock]);

  useEffect(() => {
    if (variant !== "customer" || !unlockChecked || needsPin) return;
    void loadPromoBoard();
    const timer = window.setInterval(() => void loadPromoBoard(), 60_000);
    return () => window.clearInterval(timer);
  }, [variant, unlockChecked, needsPin, loadPromoBoard]);

  const loadRef = useRef(load);
  const loadServicesRef = useRef(loadServices);
  const loadProductsRef = useRef(loadProducts);
  const loadCheckoutRef = useRef(loadCheckout);
  loadRef.current = load;
  loadServicesRef.current = loadServices;
  loadProductsRef.current = loadProducts;
  loadCheckoutRef.current = loadCheckout;

  const pollEnabledRef = useRef(false);
  const variantRef = useRef(variant);
  variantRef.current = variant;
  const receptionSectionRef = useRef(receptionSection);
  receptionSectionRef.current = receptionSection;

  useEffect(() => {
    const sync = () => {
      pollEnabledRef.current =
        unlockChecked && !needsPin && document.visibilityState === "visible";
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [unlockChecked, needsPin]);

  useEffect(() => {
    setRescheduleOpen(false);
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, ms);
      });

    const loop = async () => {
      while (!cancelled && !pollEnabledRef.current) {
        await sleep(50);
      }
      while (!cancelled) {
        if (pollEnabledRef.current) {
          const now = Date.now();
          if (now - displayPollAt.today >= TODAY_POLL_MS) {
            displayPollAt.today = now;
            await loadRef.current();
            if (variantRef.current === "reception") {
              const section = receptionSectionRef.current;
              if (section === "services") await loadServicesRef.current();
              else if (section === "products") await loadProductsRef.current();
            }
          }
        }
        await sleep(TODAY_POLL_MS);
      }
    };
    void loop();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (cancelled) return;
      if (pollEnabledRef.current) setNow(new Date());
      timeout = setTimeout(tick, 5_000);
    };
    timeout = setTimeout(tick, 5_000);
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const sleep = (ms: number) =>
      new Promise<void>((resolve) => {
        timeout = setTimeout(resolve, ms);
      });

    const loop = async () => {
      while (!cancelled && !pollEnabledRef.current) {
        await sleep(50);
      }
      while (!cancelled) {
        if (pollEnabledRef.current) {
          const needsCheckout =
            variantRef.current === "customer" || checkoutLiveRef.current;
          if (needsCheckout) {
            const now = Date.now();
            const delay = checkoutLiveRef.current ? CHECKOUT_POLL_MS : TODAY_POLL_MS;
            if (now - displayPollAt.checkout >= delay) {
              displayPollAt.checkout = now;
              await loadCheckoutRef.current();
            }
          }
        }
        await sleep(checkoutLiveRef.current ? CHECKOUT_POLL_MS : TODAY_POLL_MS);
      }
    };
    void loop();
    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!unlockChecked || needsPin) return;
    if (variant === "reception" || tab === "services" || receptionSection === "services") {
      void loadServices();
    }
    if (variant === "reception" || tab === "products" || receptionSection === "products") {
      void loadProducts();
    }
  }, [tab, receptionSection, unlockChecked, needsPin, variant, loadServices, loadProducts]);

  const tKey = todayKey(salon?.timezone, salon?.today);
  const scheduleMaxDay = useMemo(
    () => addCalendarDays(tKey, days - 1, salon?.timezone || "America/Toronto"),
    [tKey, days, salon?.timezone]
  );

  useEffect(() => {
    if (!tKey) return;
    setScheduleDay((prev) => {
      if (!prev || prev < tKey || prev > scheduleMaxDay) return tKey;
      return prev;
    });
  }, [tKey, scheduleMaxDay]);

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
  const todayAll = useMemo(
    () => appointments.filter((a) => dayKey(a.startsAt, salon?.timezone) === tKey),
    [appointments, tKey, salon?.timezone]
  );
  const scheduleDayAll = useMemo(
    () => appointments.filter((a) => dayKey(a.startsAt, salon?.timezone) === scheduleDay),
    [appointments, scheduleDay, salon?.timezone]
  );
  const scheduleDayAppts = useMemo(
    () =>
      appointments.filter(
        (a) =>
          dayKey(a.startsAt, salon?.timezone) === scheduleDay &&
          (a.status === "BOOKED" || a.status === "CHECKED_IN")
      ),
    [appointments, scheduleDay, salon?.timezone]
  );
  const viewingScheduleToday = scheduleDay === tKey;
  const scheduleDayClosed = useMemo(() => {
    if (!scheduleDay || !salon?.closedDays?.length) return false;
    return salon.closedDays.includes(
      dayOfWeekInTz(scheduleDay, salon.timezone || "America/Toronto")
    );
  }, [scheduleDay, salon?.closedDays, salon?.timezone]);
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

  async function checkInFromDrag(appointmentId: string, targetStylistId: string) {
    const appt = appointments.find((a) => a.id === appointmentId);
    if (!appt) return;

    const occupied = appointments.some(
      (a) =>
        a.status === "CHECKED_IN" &&
        a.stylist.id === targetStylistId &&
        a.id !== appointmentId
    );
    if (occupied) {
      setSelectedId(appointmentId);
      setCheckInError("That stylist already has a client in the chair. Check in with an available stylist.");
      return;
    }
    setCheckInError("");

    const reassign = targetStylistId !== appt.stylist.id;
    const targetStylist = reassign
      ? stylists.find((s) => s.id === targetStylistId)
      : null;
    if (reassign && !targetStylist) return;

    const previous = appointments;
    boardDataSeq.current += 1;
    setStatusBusyId(appointmentId);
    setAppointments((list) =>
      list.map((a) => {
        if (a.id !== appointmentId) return a;
        const shifted = earlySeatWindow(a.startsAt, a.endsAt);
        return {
          ...a,
          status: "CHECKED_IN",
          startsAt: shifted ? shifted.startsAt.toISOString() : a.startsAt,
          endsAt: shifted ? shifted.endsAt.toISOString() : a.endsAt,
          stylist: reassign && targetStylist
            ? {
                id: targetStylist.id,
                name: targetStylist.name,
                color: targetStylist.color,
              }
            : a.stylist,
        };
      })
    );
    try {
      const body: Record<string, unknown> = { status: "CHECKED_IN" };
      if (reassign) body.stylistId = targetStylistId;
      const res = await fetch(`/api/display/${slug}/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...unlockHeaders },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && data.needsPin) {
        setAppointments(previous);
        lockToPin();
        return;
      }
      if (!res.ok) {
        setAppointments(previous);
        if (data.error) setCheckInError(String(data.error));
      } else if (data.appointment?.startsAt && data.appointment?.endsAt) {
        setAppointments((list) =>
          list.map((a) =>
            a.id === appointmentId
              ? {
                  ...a,
                  status: data.appointment.status ?? a.status,
                  startsAt: data.appointment.startsAt,
                  endsAt: data.appointment.endsAt,
                }
              : a
          )
        );
      }
    } catch {
      setAppointments(previous);
    } finally {
      setStatusBusyId(null);
    }
  }

  async function setStatus(
    id: string,
    status: string,
    chargedCents?: number,
    tipCents?: number
  ) {
    if (status === "CHECKED_IN") {
      const appt = appointments.find((a) => a.id === id);
      const occupied = Boolean(
        appt?.stylist.id &&
          appointments.some(
            (a) =>
              a.status === "CHECKED_IN" &&
              a.stylist.id === appt.stylist.id &&
              a.id !== id
          )
      );
      if (occupied) {
        setCheckInError(
          "That stylist already has a client in the chair. Check in with an available stylist."
        );
        return;
      }
      setCheckInError("");
    }

    const previous = appointments;
    boardDataSeq.current += 1;
    setStatusBusyId(id);
    setAppointments((list) =>
      list.map((a) => {
        if (a.id !== id) return a;
        const shifted = status === "CHECKED_IN" ? earlySeatWindow(a.startsAt, a.endsAt) : null;
        return {
          ...a,
          status,
          startsAt: shifted ? shifted.startsAt.toISOString() : a.startsAt,
          endsAt: shifted ? shifted.endsAt.toISOString() : a.endsAt,
          chargedCents: chargedCents ?? a.chargedCents,
          tipCents: tipCents ?? a.tipCents,
        };
      })
    );
    try {
      const res = await fetch(`/api/display/${slug}/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...unlockHeaders },
        body: JSON.stringify({ status, chargedCents, tipCents }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && data.needsPin) {
        setAppointments(previous);
        lockToPin();
        return;
      }
      if (!res.ok) {
        setAppointments(previous);
        if (status === "CHECKED_IN" && data.error) setCheckInError(String(data.error));
      } else if (data.appointment?.startsAt && data.appointment?.endsAt) {
        setAppointments((list) =>
          list.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: data.appointment.status ?? a.status,
                  startsAt: data.appointment.startsAt,
                  endsAt: data.appointment.endsAt,
                }
              : a
          )
        );
      }
    } catch {
      setAppointments(previous);
    } finally {
      setStatusBusyId(null);
    }
  }

  function applyReschedule(next: { startsAt: string; endsAt: string; stylistId: string }) {
    if (!selectedId) return;
    const chair = stylists.find((s) => s.id === next.stylistId);
    const future = new Date(next.startsAt).getTime() > Date.now();
    boardDataSeq.current += 1;
    setAppointments((list) =>
      list.map((a) => {
        if (a.id !== selectedId) return a;
        return {
          ...a,
          startsAt: next.startsAt,
          endsAt: next.endsAt,
          status: a.status === "CHECKED_IN" && future ? "BOOKED" : a.status,
          stylist: chair
            ? {
                ...a.stylist,
                id: chair.id,
                name: chair.name,
                color: chair.color,
                photoUrl: chair.photoUrl,
              }
            : a.stylist,
        };
      })
    );
    setRescheduleOpen(false);
    void load();
  }

  async function presentCheckout(appt: DisplayAppt) {
    setCheckoutError("");
    setCheckoutBusy(true);
    try {
      void loadServices();
      void loadProducts();
      const data = await checkoutAction({ action: "present", appointmentId: appt.id });
      if (data && "error" in data && data.error) {
        setCheckoutError(String(data.error));
      }
    } catch {
      setCheckoutError("Could not open checkout. Try again.");
    } finally {
      setCheckoutBusy(false);
    }
  }

  async function lockBoard() {
    setUnlockToken("");
    setAppointments([]);
    if (embedded) {
      setBoardLocked(true);
      return;
    }
    await fetch(`/api/display/${slug}/unlock`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    await checkUnlock();
  }

  async function unlockBoard() {
    if (embedded) {
      setBoardLocked(false);
      const ok = await checkUnlock();
      if (ok) {
        void load();
        void loadServices();
        void loadProducts();
      }
      return;
    }
    // Public tablet unlock is via PIN pad (needsPin already true).
  }

  async function signOutReception() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
    const next = `/display/${slug}/reception`;
    if (window.location.pathname.replace(/\/$/, "") === next) {
      window.location.reload();
      return;
    }
    window.location.assign(next);
  }

  const waiting = todayAppts.filter(
    (a) => a.status === "BOOKED" && (a.source || "ONLINE") !== "WALK_IN"
  ).length;
  const inChair = todayAppts.filter((a) => a.status === "CHECKED_IN").length;
  const isReception = variant === "reception";
  const { openHour, closeHour } = clampDisplayHours(salon?.openHour, salon?.closeHour);
  const storeClosed = Boolean(salon?.todayClosed);
  const selectedAppt = appointments.find((a) => a.id === selectedId) ?? null;
  const deskAppt =
    selectedAppt &&
    (selectedAppt.status === "BOOKED" || selectedAppt.status === "CHECKED_IN")
      ? selectedAppt
      : null;
  const chairOccupied = Boolean(
    deskAppt?.status === "BOOKED" &&
      deskAppt.stylist.id &&
      appointments.some(
        (a) =>
          a.status === "CHECKED_IN" &&
          a.stylist.id === deskAppt.stylist.id &&
          a.id !== deskAppt.id
      )
  );
  const rescheduleAppt = deskAppt
    ? {
        ...deskAppt,
        service: {
          ...deskAppt.service,
          id:
            deskAppt.service.id ||
            services.find((s) => s.name === deskAppt.service.name)?.id,
        },
      }
    : null;
  const floorStylists = (() => {
    const source = isReception && receptionSection === "calendar" ? scheduleDayAppts : todayAppts;
    const booked = new Set(
      source.flatMap((a) => [a.stylist.id, a.stylist.name].filter(Boolean) as string[])
    );
    const real = stylists.filter(
      (s) => !isE2eFixtureStylist(s) || booked.has(s.id) || booked.has(s.name)
    );
    return real.length ? real : stylists;
  })();
  const rescheduleStylists = (() => {
    const chairs = stylists.filter((s) => s.id && s.id !== "none" && !isE2eFixtureStylist(s));
    return chairs.length ? chairs : floorStylists;
  })();
  const floorAppts = (() => {
    const base =
      isReception && receptionSection === "calendar" ? scheduleDayAppts : todayAppts;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (a) =>
        a.client.name.toLowerCase().includes(q) ||
        a.service.name.toLowerCase().includes(q) ||
        a.stylist.name.toLowerCase().includes(q)
    );
  })();
  const receptionClients = useMemo(
    () => groupReceptionClients(appointments),
    [appointments]
  );
  const dateLine = now.toLocaleDateString("en-CA", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
  const timeLine = now.toLocaleTimeString("en-CA", {
    hour: "numeric",
    minute: "2-digit",
  });
  const apptDay = now.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  const checkoutOverlayOpen = Boolean(checkout && salon?.displayCheckoutEnabled !== false);
  const showPromoBoard = usePromotionBoardCycle(promoBoard, {
    paused: variant !== "customer" || checkoutOverlayOpen,
  });

  if (!unlockChecked) {
    return (
      <div className="app-splash-host">
        <div className="app-splash app-splash--display" role="status" aria-live="polite" aria-busy="true">
          <div className="app-splash-inner">
            <p className="app-splash-brand" suppressHydrationWarning>
              {salon?.name || humanizeSlug(slug)}
            </p>
            <p className="app-splash-label">Salon Display</p>
            <div className="app-splash-spinner" aria-hidden />
          </div>
        </div>
      </div>
    );
  }

  if (needsPin && !embedded) {
    return (
      <CustomerThemeRoot className="min-h-dvh">
        <DisplayPinPad
          slug={slug}
          salonName={salon?.name}
          onUnlocked={(token) => {
            setUnlockToken(token);
            setNeedsPin(false);
            setPinSet(true);
            setUnlockChecked(true);
          }}
        />
      </CustomerThemeRoot>
    );
  }

  if (needsPin && embedded) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-[#c9a87c]/30 bg-[#2a211c] p-8 text-center">
        <PadlockButton locked onClick={() => void unlockBoard()} data-testid="display-padlock" />
        <p className="max-w-sm text-sm text-[#d4c4b0]">
          Board is locked. Tap the padlock to unlock (stay signed in as manager or stylist).
        </p>
      </div>
    );
  }

  if (boardLocked && embedded) {
    return (
      <div
        className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-3xl border border-[#c9a87c]/30 bg-[#2a211c] p-8 text-center"
        data-testid="manager-store-display-board"
      >
        <PadlockButton locked onClick={() => void unlockBoard()} data-testid="display-padlock" />
        <p className="max-w-sm text-sm text-[#d4c4b0]">
          Salon display locked. Tap the padlock to unlock.
        </p>
      </div>
    );
  }

  if (isReception) {
    return (
      <div
        className={`flex ${
          embedded
            ? "min-h-[70vh] min-w-0 rounded-3xl border border-[color:var(--rx-line)]"
            : "h-dvh min-h-dvh w-full overflow-hidden"
        }`}
        data-testid={embedded ? "manager-store-display-board" : "store-display-board"}
      >
        <ReceptionThemeRoot className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
        {!embedded ? (
          <ReceptionNav
            salonName={salon?.name || "Salon"}
            staffName={staffName}
            staffRole={staffRole}
            section={receptionSection}
            onSection={setReceptionSection}
            onSignOut={() => void signOutReception()}
          />
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[var(--rx-bg)] text-[color:var(--rx-text)]">
          <header className={`flex shrink-0 flex-wrap items-center gap-3 border-b border-[color:var(--rx-line)] ${embedded ? "px-4 py-3" : "px-5 py-3.5"}`}>
            <div className="shrink-0">
              <p className="text-sm font-medium text-[color:var(--rx-text-80)]">
                Today, {apptDay}
                <span className="text-[color:var(--rx-faint)]">
                  {" "}
                  |{" "}
                  <span data-testid="display-store-hours">
                    {storeClosed
                      ? "Closed today"
                      : `${formatHourLabel(openHour)} – ${formatHourLabel(closeHour)}`}
                  </span>
                </span>
              </p>
            </div>
            {receptionSection !== "reports" ? (
            <label className="reception-search relative min-w-[12rem] flex-1">
              <span className="sr-only">Search</span>
              <input
                ref={receptionSearchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  receptionSection === "staff"
                    ? "Search stylist..."
                    : receptionSection === "services"
                      ? "Search service..."
                      : receptionSection === "products"
                        ? "Search product..."
                        : "Search client, booking, or service..."
                }
                className="w-full rounded-full border border-[color:var(--rx-line)] bg-[var(--rx-input)] py-2 pr-14 pl-4 text-sm text-[color:var(--rx-text)] placeholder:text-[color:var(--rx-faint)]"
                data-testid="reception-search"
              />
              <kbd className="reception-search__kbd" aria-hidden>
                ⌘K
              </kbd>
            </label>
            ) : (
              <div className="min-w-[12rem] flex-1" />
            )}
            <ReceptionThemeToggle />
            {!embedded ? (
              <div className="flex items-center gap-2 xl:hidden">
                {staffName ? (
                  <p className="hidden max-w-[9rem] truncate text-xs font-semibold text-[color:var(--rx-text)] sm:block">
                    {staffName}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => void signOutReception()}
                  className="rounded-full border border-[color:var(--rx-line)] px-3 py-2 text-xs font-semibold text-[color:var(--rx-muted)] hover:text-[color:var(--rx-text)]"
                >
                  Sign out
                </button>
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBookingModal("new")}
                className="reception-cta reception-cta--new"
                data-testid="reception-new-booking"
              >
                + New
              </button>
              <button
                type="button"
                onClick={() => setBookingModal("walkin")}
                className="reception-cta reception-cta--walkin"
                data-testid="reception-walk-in"
              >
                Walk-in
              </button>
            </div>
            {embedded && (pinSet || embedded) ? (
              <PadlockButton
                locked={false}
                onClick={() => void lockBoard()}
                label="Lock board"
                data-testid="display-padlock"
              />
            ) : null}
          </header>

          <nav
            className="flex shrink-0 gap-1 overflow-x-auto border-b border-[color:var(--rx-line)] px-4 py-2 xl:hidden"
            aria-label="Reception"
          >
            {RECEPTION_NAV_ITEMS.map((item) => {
              const active = receptionSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setReceptionSection(item.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                    active
                      ? "bg-[var(--rx-accent)] text-white"
                      : "text-[color:var(--rx-muted)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col xl:flex-row">
            {receptionSection === "calendar" ||
            receptionSection === "bookings" ||
            receptionSection === "clients" ? (
              <>
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 py-3 sm:px-5">
              {receptionSection === "calendar" ? (
              <>
              <ReceptionDailyMetrics
                appointments={scheduleDayAll}
                stylists={floorStylists}
                openHour={openHour}
                closeHour={closeHour}
                timeZone={salon?.timezone}
                walkInWaiting={viewingScheduleToday ? walkInWaiting : 0}
              />
              <ReceptionSchedule
                appointments={floorAppts}
                stylists={floorStylists}
                openHour={openHour}
                closeHour={closeHour}
                timeZone={salon?.timezone}
                selectedId={selectedId}
                onSelect={(a) => setSelectedId(a.id)}
                now={now}
                storeClosed={scheduleDayClosed}
                scheduleDay={scheduleDay}
                todayKey={tKey}
                scheduleDayLabel={dayLabel(scheduleDay, salon?.timezone, salon?.today)}
                scheduleMinDay={tKey}
                scheduleMaxDay={scheduleMaxDay}
                onScheduleDayChange={(day) => {
                  setScheduleDay(day);
                  setSelectedId((id) => {
                    if (!id) return id;
                    const appt = appointments.find((a) => a.id === id);
                    return appt && dayKey(appt.startsAt, salon?.timezone) === day ? id : null;
                  });
                }}
                onCheckIn={
                  viewingScheduleToday
                    ? ({ appointmentId, targetStylistId }) =>
                        void checkInFromDrag(appointmentId, targetStylistId)
                    : undefined
                }
                onCheckout={viewingScheduleToday ? presentCheckout : undefined}
                hideEmptyState={bookingModal !== null}
              />
              </>
              ) : null}
              {receptionSection === "bookings" ? (
                <ReceptionBookingsView
                  appointments={appointments}
                  query={query}
                  selectedId={selectedId}
                  onSelect={(a) => setSelectedId(a.id)}
                  timeZone={salon?.timezone}
                />
              ) : null}
              {receptionSection === "clients" ? (
                  <ReceptionClientsView
                    clients={receptionClients}
                    query={query}
                    selectedId={selectedId}
                    onSelect={(a) => setSelectedId(a.id)}
                  />
              ) : null}
            </div>
            <div
              className={`reception-actions${deskAppt ? " is-open" : ""}`}
            >
              <button
                type="button"
                className="reception-actions__backdrop"
                aria-label="Close actions"
                onClick={() => setSelectedId(null)}
              />
              {rescheduleOpen && rescheduleAppt ? (
                <ReceptionRescheduleSheet
                  appt={rescheduleAppt}
                  stylists={rescheduleStylists}
                  slug={slug}
                  timeZone={salon?.timezone}
                  unlockHeaders={unlockHeaders}
                  onClose={() => setRescheduleOpen(false)}
                  onSaved={applyReschedule}
                />
              ) : (
              <ReceptionClientPanel
                appt={deskAppt}
                onClose={() => setSelectedId(null)}
                onStatus={setStatus}
                onCheckout={presentCheckout}
                onReschedule={() => setRescheduleOpen(true)}
                busyId={statusBusyId}
                checkoutBusy={checkoutBusy}
                checkoutError={checkoutError}
                checkInError={checkInError}
                chairOccupied={chairOccupied}
              />
              )}
            </div>
              </>
            ) : (
              <div className="min-h-0 min-w-0 flex-1 overflow-hidden px-4 py-3 sm:px-5">
                {receptionSection === "staff" ? (
                  <ReceptionStaffView
                    stylists={floorStylists}
                    appointments={todayAll}
                    query={query}
                    timeZone={salon?.timezone}
                    now={now}
                    openHour={openHour}
                    closeHour={closeHour}
                    storeClosed={storeClosed}
                  />
                ) : null}
                {receptionSection === "services" ? (
                  <ReceptionServicesView groups={servicesByCategory} query={query} />
                ) : null}
                {receptionSection === "products" ? (
                  <ReceptionProductsView products={products} query={query} />
                ) : null}
                {receptionSection === "reports" ? (
                  <ReceptionReportsView
                    today={todayAll}
                    waitlist={walkInWaiting}
                    futureCount={futureCount}
                    timeZone={salon?.timezone}
                  />
                ) : null}
              </div>
            )}
          </div>
        </div>
      {checkout && checkout.status !== "PAID" ? (
        <ReceptionCheckoutDesk
          bill={checkout}
          busy={checkoutBusy}
          slug={slug}
          services={services}
          products={products}
          onAddLine={(kind, catalogId) => {
            void checkoutAction({ action: "add-line", kind, catalogId });
          }}
          onRemoveLine={(lineId) => {
            void checkoutAction({ action: "remove-line", lineId });
          }}
          onComplete={async () => {
            setCheckoutBusy(true);
            try {
              await checkoutAction({ action: "complete" });
              void load();
            } finally {
              setCheckoutBusy(false);
            }
          }}
          onCancel={() => {
            void checkoutAction({ action: "cancel" });
          }}
          onRedeemPoints={(enabled) => {
            void checkoutAction({ action: "redeem-points", enabled });
          }}
        />
      ) : null}
      <ReceptionNewBookingModal
        open={bookingModal === "new"}
        slug={slug}
        stylists={floorStylists}
        clients={receptionClients}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
        }))}
        timeZone={salon?.timezone}
        todayKey={tKey}
        unlockHeaders={unlockHeaders}
        onClose={() => setBookingModal(null)}
        onCreated={() => {
          setBookingModal(null);
          void load();
        }}
      />
      <ReceptionWalkInModal
        open={bookingModal === "walkin"}
        slug={slug}
        stylists={floorStylists}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
        }))}
        todayAppts={todayAppts}
        openHour={openHour}
        closeHour={closeHour}
        timeZone={salon?.timezone}
        unlockHeaders={unlockHeaders}
        onClose={() => setBookingModal(null)}
        onCreated={() => {
          setBookingModal(null);
          void load();
        }}
      />
        </ReceptionThemeRoot>
    </div>
  );
}

  return (
    <div
      className={`flex ${
        embedded ? "min-h-[70vh] min-w-0" : "h-dvh min-h-dvh w-full overflow-hidden"
      }`}
      data-testid={embedded ? "manager-store-display-board" : "store-display-board"}
    >
      <CustomerThemeRoot
        className={`relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--cd-bg)] text-[color:var(--cd-text)] ${
          embedded ? "rounded-3xl border border-[color:var(--cd-line)]" : ""
        }`}
      >
      <CustomerAmbientBackdrop />
      <div className="relative z-[1] flex min-h-0 min-w-0 flex-1 flex-col">
      <header className={`customer-lounge-header shrink-0 ${embedded ? "px-4 py-4 sm:px-5" : "px-8 py-6"}`}>
          <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
            <div className="flex items-center gap-4">
              <span className="customer-lounge-mark" aria-hidden>
                {(salon?.name || "S").trim().charAt(0).toUpperCase()}
              </span>
              <div>
                <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-[0.12em] text-[color:var(--cd-accent)] uppercase sm:text-3xl">
                  {salon?.name || "Salon"}
                </h1>
                <p className="customer-lounge-tagline">Beauty. Relaxation. You.</p>
              </div>
            </div>
            <div className="text-center">
              <h2 className="font-[family-name:var(--font-display)] text-2xl text-[color:var(--cd-heading)] sm:text-[1.85rem]">
                Today’s Appointments — {apptDay}
              </h2>
              <CustomerLoungeHeadlineStatus
                appointments={todayAppts}
                stylists={floorStylists}
                openHour={openHour}
                closeHour={closeHour}
                timeZone={salon?.timezone}
                now={now}
                storeClosed={storeClosed}
              />
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center justify-end gap-2">
                <CustomerViewToggle slug={slug} view={customerView} />
                <CustomerThemeToggle />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2.5">
                  <CustomerWeatherChip address={salon?.address} timezone={salon?.timezone} />
                  <div className="text-right">
                    <p className="customer-lounge-clock">{timeLine}</p>
                    <p className="text-sm text-[color:var(--cd-muted)]">{dateLine}</p>
                  </div>
                </div>
                {pinSet || embedded ? (
                  <PadlockButton
                    locked={false}
                    onClick={() => void lockBoard()}
                    label="Lock board"
                    data-testid="display-padlock"
                    className="!border-[color:var(--cd-line)] !bg-[var(--cd-input)] !text-[color:var(--cd-accent)] hover:!border-[color:var(--cd-accent)] hover:!bg-[var(--cd-input)] hover:!text-[color:var(--cd-accent)]"
                  />
                ) : null}
              </div>
            </div>
          </div>
      </header>

      <div
        className="flex min-h-0 flex-1 flex-col"
        data-testid="customer-view"
        data-customer-view={customerView}
      >
        {customerView === "timeline" ? (
          <div
            className={`customer-schedule flex min-h-0 flex-1 flex-col ${
              embedded ? "px-2 pb-2 sm:px-3" : "px-6 pb-4"
            }`}
          >
            <ReceptionSchedule
              appointments={todayAppts}
              stylists={floorStylists}
              openHour={openHour}
              closeHour={closeHour}
              timeZone={salon?.timezone}
              selectedId={null}
              onSelect={() => {}}
              now={now}
              storeClosed={storeClosed}
              nameMode="first"
              audience="customer"
              onCheckIn={({ appointmentId, targetStylistId }) =>
                void checkInFromDrag(appointmentId, targetStylistId)
              }
            />
            <ZentraLabFooter
              compact
              className="customer-lounge-footer shrink-0 !mt-0 !px-2 !py-1.5 text-[11px]"
            />
          </div>
        ) : (
          <CustomerScheduleGrid
            appointments={todayAppts}
            stylists={floorStylists}
            openHour={openHour}
            closeHour={closeHour}
            timeZone={salon?.timezone}
            now={now}
            storeClosed={storeClosed}
            compactPad={embedded}
            onCheckIn={({ appointmentId, targetStylistId }) =>
              void checkInFromDrag(appointmentId, targetStylistId)
            }
          />
        )}
      </div>
      </div>
      {showPromoBoard && promoBoard?.enabled && promoBoard.slides.length ? (
        <CustomerPromotionBoard board={promoBoard} paused={checkoutOverlayOpen} />
      ) : null}
      {salon?.displayCheckoutEnabled !== false ? (
        <CustomerCheckoutOverlay
          bill={checkout}
          thanks={null}
          onTip={
            checkout && checkout.status !== "PAID"
              ? (tipMode) => {
                  void checkoutAction({ action: "tip", tipMode });
                }
              : undefined
          }
          onLooksGood={
            checkout && checkout.status === "PENDING"
              ? () => {
                  void checkoutAction({ action: "verify" });
                }
              : undefined
          }
          onDismissThanks={
            checkout?.status === "PAID"
              ? () => {
                  hidePaidThanksRef.current = true;
                  setCheckout(null);
                  void checkoutAction({ action: "cancel" });
                }
              : undefined
          }
        />
      ) : null}
      </CustomerThemeRoot>
    </div>
  );
}

function staffRoleLabel(role?: string) {
  if (role === "STYLIST") return "Stylist";
  if (role === "FRONT_DESK") return "Front desk";
  if (role === "ADMIN" || role === "MANAGER") return "Manager";
  return "Staff";
}

function staffInitials(name?: string) {
  const parts = (name || "Front desk").trim().split(/\s+/).filter(Boolean);
  const letters = (parts[0]?.[0] || "F") + (parts[1]?.[0] || parts[0]?.[1] || "D");
  return letters.toUpperCase();
}

function ReceptionNavIcon({ id }: { id: ReceptionSection }) {
  const common = "h-4 w-4 shrink-0";
  if (id === "calendar") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="5.5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 4v3M16 4v3M4 10h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "bookings") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M6 5.5h12a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19V7A1.5 1.5 0 0 1 6 5.5Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8 9.5h8M8 13h8M8 16.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "clients") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="9" cy="8" r="2.3" stroke="currentColor" strokeWidth="1.6" />
        <path d="M4.8 18c.5-2.5 2.3-3.8 4.2-3.8S12.7 15.5 13.2 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="16.2" cy="9" r="2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M15 14.4c1.6.2 3.2 1.3 3.8 3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "staff") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.6" />
        <path d="M7 18c.6-2.8 2.6-4.2 5-4.2s4.4 1.4 5 4.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "services") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="6.5" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="6.5" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.6" />
        <path d="M8.5 8.4 19 18M8.5 15.6 19 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "products") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 8.5 12 5l7 3.5v7L12 19l-7-3.5v-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M12 19V12M5 8.5 12 12l7-3.5" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M5 18V8l7-3 7 3v10" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9 18v-5h6v5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ReceptionNav({
  salonName,
  staffName,
  staffRole,
  section,
  onSection,
  onSignOut,
}: {
  salonName: string;
  staffName?: string;
  staffRole?: string;
  section: ReceptionSection;
  onSection: (section: ReceptionSection) => void;
  onSignOut?: () => void;
}) {
  return (
    <aside className="reception-nav hidden w-[15.5rem] shrink-0 flex-col px-4 py-6 xl:flex">
      <div className="mb-8 flex items-start gap-3">
        <span className="reception-nav__mark" aria-hidden>
          {(salonName || "S").trim().charAt(0).toUpperCase()}
        </span>
        <div>
          <p
            className="text-[10px] font-bold tracking-[0.14em] leading-snug text-[color:var(--rx-accent)] uppercase"
            data-testid="reception-salon-name"
          >
            {salonName}
          </p>
          <p className="mt-1 text-sm font-semibold leading-snug text-[color:var(--rx-text)]">Reception</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1" aria-label="Reception">
        {RECEPTION_NAV_ITEMS.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSection(item.id)}
              data-testid={`reception-nav-${item.id}`}
              className={`reception-nav__item ${active ? "is-active" : ""}`}
            >
              <ReceptionNavIcon id={item.id} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-4 border-t border-[color:var(--rx-line)] pt-4" data-testid="reception-signed-in">
        <div className="flex items-center gap-2">
          <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[var(--rx-accent)] text-xs font-bold text-white">
            {staffInitials(staffName)}
            <span className="absolute right-0 bottom-0 h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-[color:var(--rx-nav)]" />
          </span>
          <div className="min-w-0">
            <p
              className="truncate text-xs font-semibold text-[color:var(--rx-text)]"
              data-testid="reception-signed-in-name"
            >
              {staffName || staffRoleLabel(staffRole)}
            </p>
            <p
              className="truncate text-[10px] text-[color:var(--rx-muted)]"
              data-testid="reception-signed-in-as"
            >
              Logged in as reception
            </p>
            <p className="truncate text-[10px] text-[color:var(--rx-faint)]">
              {staffRoleLabel(staffRole)}
            </p>
          </div>
        </div>
        {onSignOut ? (
          <button
            type="button"
            onClick={onSignOut}
            className="mt-3 w-full rounded-xl border border-[color:var(--rx-line)] px-3 py-2 text-xs font-semibold text-[color:var(--rx-muted)] hover:text-[color:var(--rx-text)]"
            data-testid="reception-sign-out"
          >
            Sign out
          </button>
        ) : null}
      </div>
    </aside>
  );
}
