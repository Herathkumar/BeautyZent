"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { hitChairDrop, resolveDropTarget, type ChairDrag } from "@/components/display/chair-drop";
import { StylistChairStatus } from "@/components/display/StylistChairStatus";
import {
  canChairCheckIn,
  chairAcceptsDrop,
  firstName,
  formatClock,
  formatMinutesClock,
  formatWaitMinutes,
  isLoungeStaffOffDuty,
  loungeFloorStats,
  loungeNextOpenLabel,
  loungeReserveUrl,
  loungeTeamStatus,
  seatedServiceProgress,
  serviceKind,
  stylistChairVisual,
  stylistCurrentGuest,
  stylistFloorTone,
  stylistSpecialtyBadges,
  stylistWaitInfo,
  type DisplayAppt,
  type DisplayStylist,
} from "@/lib/display-schedule";
import { appointmentCalendarTone } from "@/lib/stylist-calendar-colors";

const BOOKING_SCAN_MS = 6_000;
const TEAM_PAGE_SIZE = 3;
const TEAM_ROTATE_MS = 10_000;
const LOOKS_ROTATE_MS = 8_000;
const RETAIL_PAGE_SIZE = 3;
const RETAIL_ROTATE_MS = 8_000;
const MENU_FEATURE_ROTATE_MS = 8_000;
const LOUNGE_MENU_MAX = 4;
const LOUNGE_MENU_MIN_PAD = 3;

type LoungeLook = {
  id: string;
  styleNumber: number;
  title: string;
  category: string;
  description?: string | null;
  beforeUrl?: string | null;
  afterUrl?: string | null;
};

export function ActiveProgressBar({
  progress,
  label,
  colorVar = "--cd-accent",
}: {
  progress: number;
  label: string;
  colorVar?: string;
}) {
  const pct = Math.max(0, Math.min(100, progress * 100));
  return (
    <div className="mt-1.5 w-full">
      <div className="mb-1 flex items-end justify-between">
        <span
          className="text-[9px] font-bold uppercase tracking-wider opacity-90"
          style={{ color: `var(${colorVar})` }}
        >
          Progress
        </span>
        <span className="text-[10px] font-bold text-[color:var(--cd-heading)]">
          {label.replace("~", "").replace(" left", " left")}
        </span>
      </div>
      <div
        className="h-[4px] w-full overflow-hidden rounded-full"
        style={{ background: `color-mix(in srgb, var(${colorVar}) 20%, transparent)` }}
      >
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, background: `var(${colorVar})` }}
        />
      </div>
    </div>
  );
}

type LoungeProduct = {
  id: string;
  name: string;
  priceCents: number;
  imageUrl?: string | null;
};

type LoungeService = {
  id: string;
  name: string;
  priceCents: number;
  durationMin?: number;
  featured?: boolean;
  imageUrl?: string | null;
};

const LOUNGE_DEFAULT_LOOK_BEFORE = "/lounge/look-before.jpg";
const LOUNGE_DEFAULT_LOOK_AFTER = "/lounge/look-after.jpg";
const LOUNGE_DEFAULT_RETAIL = [
  { id: "p1", name: "Shampoo 250ml", priceCents: 1800, imageUrl: "/lounge/product-shampoo.jpg" },
  { id: "p2", name: "Conditioner 250ml", priceCents: 1800, imageUrl: "/lounge/product-conditioner.jpg" },
  { id: "p3", name: "Hair oil", priceCents: 2200, imageUrl: "/lounge/product-oil.jpg" },
  { id: "p4", name: "Hair serum", priceCents: 2400, imageUrl: "/lounge/product-serum.jpg" },
  { id: "p5", name: "Hair mask", priceCents: 2800, imageUrl: "/lounge/product-mask.jpg" },
  { id: "p6", name: "Beard oil", priceCents: 2200, imageUrl: "/lounge/product-beard-oil.jpg" },
  { id: "p7", name: "Pomade", priceCents: 1900, imageUrl: "/lounge/product-pomade.jpg" },
  { id: "p8", name: "Dry shampoo", priceCents: 1900, imageUrl: "/lounge/product-dry-shampoo.jpg" },
  { id: "p9", name: "Hand cream", priceCents: 1600, imageUrl: "/lounge/product-hand-cream.jpg" },
] as const;

const LOUNGE_DEFAULT_MENU: LoungeService[] = [
  { id: "s1", name: "Women's haircut & style", durationMin: 60, priceCents: 7000 },
  { id: "s2", name: "Trim & tidy", durationMin: 20, priceCents: 2500 },
  { id: "s3", name: "Bang / fringe trim", durationMin: 15, priceCents: 1800 },
  { id: "s4", name: "Men's haircut", durationMin: 30, priceCents: 3500 },
];

function money(cents: number) {
  return `$${Math.round(cents / 100)}`;
}

/** Featured first (or sort order), max 4; pad from remaining active when featured < 3. */
function pickLoungeMenu(services: LoungeService[]): LoungeService[] {
  const source = services.length ? services : LOUNGE_DEFAULT_MENU;
  const featured = source.filter((s) => s.featured);
  const rest = source.filter((s) => !s.featured);
  const ordered = featured.length ? [...featured, ...rest] : source;
  const seen = new Set<string>();
  const unique = ordered.filter((s) => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
  let count = Math.min(LOUNGE_MENU_MAX, unique.length);
  if (featured.length > 0 && featured.length < LOUNGE_MENU_MIN_PAD) {
    count = Math.min(LOUNGE_MENU_MAX, Math.max(LOUNGE_MENU_MIN_PAD, featured.length), unique.length);
  }
  return unique.slice(0, count);
}

/** Services with photos for the optional featured strip above the list. */
function loungeMenuFeaturePhotos(services: LoungeService[]): LoungeService[] {
  const source = services.length ? services : LOUNGE_DEFAULT_MENU;
  const seen = new Set<string>();
  return source.filter((s) => {
    if (!s.imageUrl || seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

function isPlaceholderStylistPhoto(url?: string | null) {
  if (!url) return true;
  return /\/avatars\/stylist-(neutral|male|female)\.svg(?:\?|$)/i.test(url);
}

function stylistInitials(name: string) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
}

function loungeStatusRingClass(kind: Parameters<typeof stylistFloorTone>[0]) {
  const tone = stylistFloorTone(kind);
  if (tone === "available") return "ring-[3px] ring-[color:var(--cd-accent)]";
  if (tone === "busy") return "ring-[3px] ring-[#f0ebe3]";
  return "ring-[3px] ring-[color:var(--cd-accent)]";
}

function shortService(name: string) {
  const clean = (name || "service").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return clean;
  return words.slice(0, 2).join(" ");
}

function qrSrc(data: string, size = 160) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&color=1a1613&bgcolor=f6efe4&data=${encodeURIComponent(data)}`;
}

function dayKey(iso: string, timeZone?: string | null) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || undefined,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function LoungeBookingChip({
  appointments,
  stylist,
  timeZone,
  now,
  paused,
  onCheckIn,
  onCardPointerDown,
  onCardPointerMove,
  onCardPointerUp,
  draggingId,
}: {
  appointments: DisplayAppt[];
  stylist: DisplayStylist;
  timeZone?: string | null;
  now: Date;
  paused?: boolean;
  onCheckIn?: (payload: { appointmentId: string; targetStylistId: string }) => void;
  onCardPointerDown: (e: React.PointerEvent, appt: DisplayAppt, stylist: DisplayStylist) => void;
  onCardPointerMove: (e: React.PointerEvent) => void;
  onCardPointerUp: (e: React.PointerEvent) => void;
  draggingId?: string | null;
}) {
  const list = [...appointments].sort((a, b) => {
    if (a.status === "CHECKED_IN" && b.status !== "CHECKED_IN") return -1;
    if (b.status === "CHECKED_IN" && a.status !== "CHECKED_IN") return 1;
    return a.startsAt.localeCompare(b.startsAt);
  });
  const ids = list.map((a) => a.id).join(",");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex((i) => (list.length ? i % list.length : 0));
  }, [ids, list.length]);

  useEffect(() => {
    if (list.length < 2 || paused) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, BOOKING_SCAN_MS);
    return () => window.clearInterval(timer);
  }, [ids, list.length, paused]);

  if (!list.length) return null;
  const a = list[Math.min(index, list.length - 1)];
  const kind = serviceKind(a.service.name);
  const tone = appointmentCalendarTone({
    serviceName: a.service.name,
    status: a.status,
    source: a.source,
  });
  const checkIn = Boolean(onCheckIn && canChairCheckIn(a.status));
  const onChair = a.status === "CHECKED_IN";
  const remaining = onChair ? seatedServiceProgress(a, now) : null;

  return (
    <div className={`lounge-v2-chip${onChair ? " is-on-chair" : ""}`}>
      <div
        key={a.id}
        data-testid="customer-appt-card"
        data-appt-status={a.status}
        data-appt-id={a.id}
        data-on-chair={onChair ? "true" : undefined}
        data-service-kind={kind}
        className={`lounge-v2-chip__card${checkIn ? " customer-appt-card--draggable" : ""}${
          draggingId === a.id ? " customer-appt-card--dragging" : ""
        }`}
        style={{
          touchAction: checkIn ? "none" : undefined,
          background: tone.bg,
          color: tone.text,
          borderColor: tone.badge,
        }}
        title={`${formatClock(a.startsAt, timeZone)} · ${a.service.name}${
          checkIn ? " · Drag onto chair to check in" : ""
        }${remaining ? ` · ${remaining.remainingLabel}` : ""}`}
        onPointerDown={checkIn ? (e) => onCardPointerDown(e, a, stylist) : undefined}
        onPointerMove={checkIn ? onCardPointerMove : undefined}
        onPointerUp={checkIn ? onCardPointerUp : undefined}
        onPointerCancel={checkIn ? onCardPointerUp : undefined}
      >
        <span className="lounge-v2-chip__name" style={{ color: tone.text }}>
          {firstName(a.client.name)}
        </span>
        <span className="lounge-v2-chip__meta" style={{ color: tone.text, opacity: 0.78 }}>
          {formatClock(a.startsAt, timeZone)} · {shortService(a.service.name)}
        </span>
        {remaining ? (
          <ActiveProgressBar progress={remaining.progress} label={remaining.remainingLabel} />
        ) : null}
      </div>
    </div>
  );
}

function statusPillText(
  visual: { kind: string; guestName: string | null },
  wait: { kind: string; waitMs: number; freeMin: number | null; label: string },
  currentAppt: DisplayAppt | null
) {
  return loungeTeamStatus(
    {
      kind: visual.kind as "available" | "waiting" | "opens" | "closed" | "done",
      waitMs: wait.waitMs,
      freeMin: wait.freeMin,
      label: wait.label,
      sublabel: null,
    },
    visual.guestName || currentAppt?.client.name
  );
}

export function CustomerScheduleGrid({
  appointments,
  stylists,
  openHour,
  closeHour,
  timeZone,
  now,
  storeClosed,
  compactPad,
  onCheckIn,
  slug,
  salonName,
  products = [],
  services = [],
  wifiName,
  looks = [],
  closedDays,
  coverUrl,
  walkInsWelcome = true,
}: {
  appointments: DisplayAppt[];
  stylists: DisplayStylist[];
  openHour: number;
  closeHour: number;
  timeZone?: string | null;
  now: Date;
  storeClosed?: boolean;
  compactPad?: boolean;
  onCheckIn?: (payload: { appointmentId: string; targetStylistId: string }) => void;
  slug?: string;
  salonName?: string;
  products?: LoungeProduct[];
  services?: LoungeService[];
  offerLine?: string | null;
  wifiName?: string | null;
  looks?: LoungeLook[];
  closedDays?: number[] | null;
  coverUrl?: string | null;
  walkInsWelcome?: boolean;
}) {
  const [demoMode, setDemoMode] = useState("");
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("demo") || "";
      setDemoMode(q.toLowerCase());
    } catch {
      setDemoMode("");
    }
  }, []);
  const columns = stylists.length
    ? stylists
    : [{ id: "none", name: "Chair", bio: null, color: "#c19a6b", photoUrl: "" }];
  const pending = useRef<{
    pointerId: number;
    appt: DisplayAppt;
    stylist: DisplayStylist;
    x: number;
    y: number;
  } | null>(null);
  const dragRef = useRef<ChairDrag | null>(null);
  const [drag, setDrag] = useState<ChairDrag | null>(null);
  const [teamPage, setTeamPage] = useState(0);
  const [lookPage, setLookPage] = useState(0);
  const [retailPage, setRetailPage] = useState(0);
  const [menuFeaturePage, setMenuFeaturePage] = useState(0);
  function publishDrag(next: ChairDrag | null) {
    dragRef.current = next;
    setDrag(next);
  }

  function endDrag(clientX: number, clientY: number, commit: boolean) {
    const current = dragRef.current;
    pending.current = null;
    publishDrag(null);
    if (!commit || !current || !onCheckIn) return;
    const hit = hitChairDrop(clientX, clientY);
    const targetStylistId = resolveDropTarget(hit, current.stylistId);
    if (targetStylistId) {
      onCheckIn({ appointmentId: current.apptId, targetStylistId });
    }
  }

  function onCardPointerDown(e: React.PointerEvent, appt: DisplayAppt, stylist: DisplayStylist) {
    if (!onCheckIn || !canChairCheckIn(appt.status) || e.button !== 0) return;
    pending.current = { pointerId: e.pointerId, appt, stylist, x: e.clientX, y: e.clientY };
  }

  function onCardPointerMove(e: React.PointerEvent) {
    const start = pending.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!dragRef.current && dx * dx + dy * dy < 64) return;
    if (!dragRef.current) {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    const hit = hitChairDrop(e.clientX, e.clientY);
    const over = resolveDropTarget(hit, start.stylist.id);
    publishDrag({
      apptId: start.appt.id,
      stylistId: start.stylist.id,
      stylistName: start.stylist.name,
      label: `${firstName(start.appt.client.name)} · ${start.appt.service.name}`,
      x: e.clientX,
      y: e.clientY,
      overStylistId: over,
    });
  }

  function onCardPointerUp(e: React.PointerEvent) {
    if (pending.current?.pointerId !== e.pointerId && !dragRef.current) return;
    endDrag(e.clientX, e.clientY, Boolean(dragRef.current));
  }

  const todayKeyStr = dayKey(now.toISOString(), timeZone);

  const todayFloorAppts = appointments.filter(
    (a) => dayKey(a.startsAt, timeZone) === todayKeyStr
  );

  const floor = columns.map((stylist) => {
    const items = todayFloorAppts.filter(
      (a) => a.stylist.id === stylist.id || a.stylist.name === stylist.name
    );
    const wait = stylistWaitInfo(items, now, openHour, closeHour, timeZone, storeClosed);
    const visual = stylistChairVisual(wait, stylistCurrentGuest(items, now, timeZone));
    const seated = items.find((a) => a.status === "CHECKED_IN") || null;
    return { stylist, items, wait, visual, seated };
  });

  const onDuty = floor.filter(({ visual }) => !isLoungeStaffOffDuty(visual.kind));
  const offToday = floor.filter(({ visual }) => isLoungeStaffOffDuty(visual.kind));
  const teamRoster = storeClosed ? [] : onDuty;
  const teamPageCount = Math.max(1, Math.ceil(Math.max(teamRoster.length, 1) / TEAM_PAGE_SIZE));

  useEffect(() => {
    setTeamPage((p) => (teamPageCount ? p % teamPageCount : 0));
  }, [teamPageCount, teamRoster.length]);

  useEffect(() => {
    if (teamPageCount < 2 || drag) return;
    const timer = window.setInterval(() => {
      setTeamPage((p) => (p + 1) % teamPageCount);
    }, TEAM_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [teamPageCount, drag]);

  const teamVisible = teamRoster.slice(
    teamPage * TEAM_PAGE_SIZE,
    teamPage * TEAM_PAGE_SIZE + TEAM_PAGE_SIZE
  );

  const stats = loungeFloorStats(
    onDuty.map(({ wait, visual }) => ({
      kind: visual.kind,
      waitMs: visual.kind === "available" ? 0 : wait.waitMs,
    }))
  );

  const nowMs = now.getTime();
  const horizonMs = nowMs + 90 * 60_000;

  const seatedNow = todayFloorAppts
    .filter((a) => a.status === "CHECKED_IN")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  const upNext = todayFloorAppts
    .filter(
      (a) =>
        a.status === "BOOKED" &&
        new Date(a.startsAt).getTime() >= nowMs - 5 * 60_000 &&
        new Date(a.startsAt).getTime() <= horizonMs
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  const nextOpen = loungeNextOpenLabel(now, openHour, closedDays, timeZone);
  const closeTimeLabel = formatMinutesClock(closeHour * 60);
  const waitZero = stats.avgWaitMs <= 0;
  const centerTitle =
    waitZero && walkInsWelcome ? "Walk-ins welcome" : `Avg wait ${formatWaitMinutes(stats.avgWaitMs)}`;
  const nowHead = seatedNow
    ? `${firstName(seatedNow.stylist.name)} · ${shortService(seatedNow.service.name)}`
    : stats.availableCount > 0
      ? "Chair open"
      : "All chairs busy";
  const upNextHead = upNext
    ? `${formatClock(upNext.startsAt, timeZone)} ${shortService(upNext.service.name)}`
    : waitZero
      ? "Next walk-in slot open"
      : `Next walk-in ~${formatWaitMinutes(stats.nextWaitMs)}`;

  const menuServices = useMemo(() => pickLoungeMenu(services), [services]);
  const menuFeatures = useMemo(() => loungeMenuFeaturePhotos(services), [services]);

  useEffect(() => {
    setMenuFeaturePage((p) => (menuFeatures.length ? p % menuFeatures.length : 0));
  }, [menuFeatures.length]);

  useEffect(() => {
    if (menuFeatures.length < 2) return;
    const timer = window.setInterval(() => {
      setMenuFeaturePage((p) => (p + 1) % menuFeatures.length);
    }, MENU_FEATURE_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [menuFeatures.length]);

  const activeMenuFeature =
    menuFeatures[Math.min(menuFeaturePage, menuFeatures.length - 1)] || menuFeatures[0] || null;

  const catalogRetail: LoungeProduct[] = useMemo(() => {
    const withPhotos = products.filter((p) => Boolean(p.imageUrl));
    const source = (
      withPhotos.length ? withPhotos : products.length ? products : [...LOUNGE_DEFAULT_RETAIL]
    ).map((p, i) => ({
      id: p.id,
      name: p.name,
      priceCents: p.priceCents,
      imageUrl: p.imageUrl || LOUNGE_DEFAULT_RETAIL[i % LOUNGE_DEFAULT_RETAIL.length]?.imageUrl,
    }));
    return source;
  }, [products]);

  const retailPageCount = Math.max(1, Math.ceil(catalogRetail.length / RETAIL_PAGE_SIZE));
  const retail =
    catalogRetail.slice(retailPage * RETAIL_PAGE_SIZE, retailPage * RETAIL_PAGE_SIZE + RETAIL_PAGE_SIZE) ||
    [];

  const catalogLooks: LoungeLook[] = looks.length
    ? looks
    : [
        {
          id: "default-1",
          styleNumber: 1,
          title: "Soft Waves",
          category: "WOMEN",
          description: "Ask reception for style #1",
          beforeUrl: "/lounge/look-01-waves-before.png",
          afterUrl: "/lounge/look-01-waves-after.png",
        },
        {
          id: "default-2",
          styleNumber: 2,
          title: "Classic Fade",
          category: "MEN",
          description: "Ask reception for style #2",
          beforeUrl: "/lounge/look-02-fade-before.png",
          afterUrl: "/lounge/look-02-fade-after.png",
        },
        {
          id: "default-3",
          styleNumber: 3,
          title: "Caramel Balayage",
          category: "COLOR",
          description: "Ask reception for style #3",
          beforeUrl: "/lounge/look-03-balayage-before.png",
          afterUrl: "/lounge/look-03-balayage-after.png",
        },
        {
          id: "default-7",
          styleNumber: 7,
          title: "Full Hair Colour",
          category: "COLOR",
          description: "Ask reception for style #7",
          beforeUrl: "/lounge/look-07-colour-before.png",
          afterUrl: "/lounge/look-07-colour-after.png",
        },
        {
          id: "default-8",
          styleNumber: 8,
          title: "Sculpted Beard",
          category: "BEARD",
          description: "Ask reception for style #8",
          beforeUrl: "/lounge/look-08-beard-before.png",
          afterUrl: "/lounge/look-08-beard-after.png",
        },
      ];

  useEffect(() => {
    setLookPage((p) => (catalogLooks.length ? p % catalogLooks.length : 0));
  }, [catalogLooks.length]);

  useEffect(() => {
    if (catalogLooks.length < 2) return;
    const timer = window.setInterval(() => {
      setLookPage((p) => (p + 1) % catalogLooks.length);
    }, LOOKS_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [catalogLooks.length]);

  useEffect(() => {
    setRetailPage((p) => (retailPageCount ? p % retailPageCount : 0));
  }, [retailPageCount]);

  useEffect(() => {
    if (retailPageCount < 2) return;
    const timer = window.setInterval(() => {
      setRetailPage((p) => (p + 1) % retailPageCount);
    }, RETAIL_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [retailPageCount]);

  const activeLook = catalogLooks[Math.min(lookPage, catalogLooks.length - 1)] || catalogLooks[0];
  const beforeSrc = activeLook?.beforeUrl || LOUNGE_DEFAULT_LOOK_BEFORE;
  const afterSrc = activeLook?.afterUrl || LOUNGE_DEFAULT_LOOK_AFTER;
  const bookingHref = slug ? loungeReserveUrl(slug) : "";
  const bookingLabel = bookingHref.replace(/^https?:\/\//, "");
  const wifi = (wifiName || "").trim();
  const forceClosed = demoMode === "closed";
  const forceOpen = demoMode === "open";
  const showClosedLayout =
    forceClosed || (!forceOpen && (Boolean(storeClosed) || onDuty.length === 0));
  const openDayLabel = nextOpen.day === "today" ? "today" : nextOpen.day;
  const opensHeadline = `Opens ${openDayLabel} ${nextOpen.time}`;
  const tickerWait = showClosedLayout
    ? null
    : waitZero && walkInsWelcome
      ? "Walk-ins welcome"
      : `Avg wait ${formatWaitMinutes(stats.avgWaitMs)}`;
  const coverSrc = coverUrl || "/display-promo.jpg";

  const padClass = compactPad ? "lounge-v2--compact" : "";

  const qrBlock = (
    <div className="lounge-v2-book">
      {bookingHref ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="lounge-v2-book__qr"
          src={qrSrc(bookingHref, 148)}
          alt="QR code to reserve on your phone"
          width={148}
          height={148}
        />
      ) : (
        <div className="lounge-v2-book__qr lounge-v2-book__qr--empty" aria-hidden />
      )}
      <div>
        <p className="lounge-v2-book__title">Reserve on your phone</p>
        <p className="lounge-v2-book__url">{bookingLabel || "beautyzent.ca"}</p>
      </div>
    </div>
  );

  const looksRetail = (
    <section className="lounge-v2__col lounge-v2__col--side" aria-label="Looks and retail">
      <div className="lounge-v2-card lounge-v2-card--looks">
        <div className="lounge-v2-looks-head">
          <h3 className="lounge-v2__eyebrow">Looks of the week</h3>
          {catalogLooks.length > 1 ? (
            <div className="lounge-v2__team-dots" aria-hidden>
              {catalogLooks.map((look, i) => (
                <span key={look.id} className={i === lookPage ? "is-on" : undefined} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="lounge-v2-looks" key={activeLook?.id || "look"}>
          <figure>
            <div className="lounge-v2-looks__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforeSrc} alt="Before look" />
            </div>
            <figcaption>Before</figcaption>
          </figure>
          <span className="lounge-v2-looks__arrow" aria-hidden>
            →
          </span>
          <figure>
            <div className="lounge-v2-looks__media">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterSrc} alt="After look" />
            </div>
            <figcaption>After</figcaption>
          </figure>
        </div>
        {activeLook ? (
          <div className="lounge-v2-looks-meta">
            <span className="lounge-v2-looks-meta__num">Style #{activeLook.styleNumber}</span>
            <div>
              <p className="lounge-v2-looks-meta__title">{activeLook.title}</p>
              <p className="lounge-v2-looks-meta__hint">
                {activeLook.description ||
                  `Tell reception you want style #${activeLook.styleNumber}`}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="lounge-v2-card lounge-v2-card--retail">
        <div className="lounge-v2-looks-head">
          <h3 className="lounge-v2__eyebrow">Retail favorites</h3>
          {retailPageCount > 1 ? (
            <div className="lounge-v2__team-dots" aria-hidden>
              {Array.from({ length: retailPageCount }, (_, i) => (
                <span key={i} className={i === retailPage ? "is-on" : undefined} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="lounge-v2-retail" key={`retail-${retailPage}`}>
          {retail.map((p) => (
            <article key={p.id} className="lounge-v2-retail__item">
              <div className="lounge-v2-retail__shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.imageUrl || LOUNGE_DEFAULT_RETAIL[0].imageUrl} alt="" />
              </div>
              <p>{p.name}</p>
              <strong>{money(p.priceCents)}</strong>
            </article>
          ))}
        </div>
      </div>
    </section>
  );

  return (
    <div
      className={`lounge-v2 ${padClass}${showClosedLayout ? " lounge-v2--closed" : ""}`}
      data-testid="customer-lounge-board"
      data-lounge-state={showClosedLayout ? "closed" : "open"}
    >
      {showClosedLayout ? (
        <div className="lounge-v2__grid lounge-v2__grid--closed">
          <section className="lounge-v2-closed-hero" aria-label="Closed">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverSrc} alt="" className="lounge-v2-closed-hero__img" />
            <div className="lounge-v2-closed-hero__shade" aria-hidden />
            <div className="lounge-v2-closed-hero__content">
              <h1 className="lounge-v2__title lounge-v2-closed-hero__title">{opensHeadline}</h1>
              {qrBlock}
            </div>
          </section>
          {looksRetail}
        </div>
      ) : (
      <div className="lounge-v2__grid">
        <section className="lounge-v2__col lounge-v2__col--team" aria-label="Today's team">
          <div className="lounge-v2__team-head">
            <h2 className="lounge-v2__eyebrow">Meet today’s team</h2>
            {teamPageCount > 1 ? (
              <div className="lounge-v2__team-dots" aria-hidden>
                {Array.from({ length: teamPageCount }, (_, i) => (
                  <span key={i} className={i === teamPage ? "is-on" : undefined} />
                ))}
              </div>
            ) : null}
          </div>
          <div
            className="lounge-v2__team"
            data-team-page={teamPage}
            data-team-count={teamRoster.length}
          >
            {teamVisible.length === 0 ? (
              <p className="lounge-v2__team-off">No stylists on the floor right now</p>
            ) : (
              teamVisible.map(({ stylist, items, wait, visual, seated }) => {
              const chairWait = { ...wait, kind: visual.kind };
              const dropTarget = Boolean(
                drag && chairAcceptsDrop(visual.kind, stylist.id === drag.stylistId)
              );
              const dropHot = Boolean(dropTarget && drag?.overStylistId === stylist.id);
              const openAppts = items
                .filter((a) => a.status === "BOOKED" || a.status === "CHECKED_IN")
                .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
              const specialty = stylistSpecialtyBadges(stylist.bio, stylist.name)[0] || "Stylist";
              const pillHint = statusPillText(visual, wait, seated);
              const showInitials = isPlaceholderStylistPhoto(stylist.photoUrl);

              return (
                <article
                  key={stylist.id}
                  data-stylist-column={stylist.id}
                  className="lounge-v2-stylist"
                >
                  <div
                    className={`customer-stylist-photo-ring lounge-v2-stylist__photo overflow-hidden rounded-full ring-offset-2 ring-offset-[var(--cd-panel)] ${loungeStatusRingClass(
                      visual.kind
                    )}`}
                    data-testid="stylist-status-ring"
                    data-status-tone={stylistFloorTone(visual.kind)}
                    title={wait.label}
                  >
                    {showInitials ? (
                      <span className="lounge-v2-stylist__initials" aria-hidden>
                        {stylistInitials(stylist.name)}
                      </span>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={stylist.photoUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="lounge-v2-stylist__body">
                    <div className="lounge-v2-stylist__who">
                      <h3>{firstName(stylist.name)}</h3>
                      <p>{specialty}</p>
                    </div>
                    <div
                      data-testid="stylist-chair-drop"
                      data-chair-drop={stylist.id}
                      data-chair-name={stylist.name}
                      data-chair-kind={visual.kind}
                      className={`customer-stylist-chair-drop lounge-v2-stylist__drop${
                        dropTarget ? " is-drop-target" : ""
                      }${dropHot ? " is-hot" : ""}`}
                      title={pillHint}
                    >
                      <StylistChairStatus
                        variant="lounge"
                        wait={chairWait}
                        guestName={visual.guestName}
                        dropActive={dropHot}
                        dropTarget={dropTarget && !dropHot}
                      />
                    </div>
                    {openAppts.length ? (
                      <LoungeBookingChip
                        appointments={openAppts}
                        stylist={stylist}
                        timeZone={timeZone}
                        now={now}
                        paused={Boolean(drag)}
                        onCheckIn={onCheckIn}
                        onCardPointerDown={onCardPointerDown}
                        onCardPointerMove={onCardPointerMove}
                        onCardPointerUp={onCardPointerUp}
                        draggingId={drag?.apptId}
                      />
                    ) : null}
                  </div>
                </article>
              );
            })
            )}
            {offToday.length ? (
              <p className="lounge-v2__team-off">
                Off today · {offToday.map((row) => firstName(row.stylist.name)).join(", ")}
              </p>
            ) : null}
          </div>
        </section>

        <section className="lounge-v2__col lounge-v2__col--center" aria-label="Lounge status">
          <h2 className="lounge-v2__title">{centerTitle}</h2>
          <ol className="lounge-v2-timeline">
            <li className="lounge-v2-timeline__item is-now">
              <span className="lounge-v2-timeline__dot" aria-hidden />
              <div>
                <p className="lounge-v2-timeline__label">Now</p>
                <p className="lounge-v2-timeline__head">{nowHead}</p>
              </div>
            </li>
            <li className="lounge-v2-timeline__item">
              <span className="lounge-v2-timeline__dot" aria-hidden />
              <div>
                <p className="lounge-v2-timeline__label">Up next</p>
                <p className="lounge-v2-timeline__head">{upNextHead}</p>
              </div>
            </li>
          </ol>

          <nav className="lounge-v2-menu" aria-label="Menu">
            <div className="lounge-v2-menu__head">
              <h3 className="lounge-v2-menu__label">
                <span aria-hidden>◆</span>
                Menu
                <span aria-hidden>◆</span>
              </h3>
              {menuFeatures.length > 1 ? (
                <div className="lounge-v2__team-dots" aria-hidden>
                  {menuFeatures.map((s, i) => (
                    <span key={s.id} className={i === menuFeaturePage ? "is-on" : undefined} />
                  ))}
                </div>
              ) : null}
            </div>
            {activeMenuFeature?.imageUrl ? (
              <div className="lounge-v2-menu__feature" key={activeMenuFeature.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={activeMenuFeature.imageUrl} alt="" />
              </div>
            ) : null}
            <ul className="lounge-v2-menu__list">
              {menuServices.map((s) => (
                <li key={s.id} className="lounge-v2-menu__row">
                  <span className="lounge-v2-menu__name">{s.name}</span>
                  <span className="lounge-v2-menu__dur">{s.durationMin ?? 45} min</span>
                  <span className="lounge-v2-menu__price">{money(s.priceCents)}</span>
                </li>
              ))}
            </ul>
          </nav>

          {qrBlock}
        </section>

        {looksRetail}
      </div>
      )}

      <footer className="lounge-v2-foot">
        {showClosedLayout ? (
          <p className="lounge-v2-foot__powered">Powered by BeautyZent</p>
        ) : (
          <p className="lounge-v2-foot__ticker">
            {[
              wifi ? `Wi-Fi ${wifi}` : null,
              tickerWait,
              `Open until ${closeTimeLabel}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
      </footer>

      {drag ? (
        <div className="customer-appt-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {drag.label}
        </div>
      ) : null}
    </div>
  );
}
