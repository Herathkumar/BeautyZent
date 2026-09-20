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
  loungeFloorStats,
  seatedServiceProgress,
  serviceKind,
  stylistChairVisual,
  stylistCurrentGuest,
  stylistFloorTone,
  stylistSpecialtyBadges,
  stylistStatusRingClass,
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

function money(cents: number) {
  return `$${Math.round(cents / 100)}`;
}

function shortService(name: string) {
  const clean = (name || "service").trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return clean;
  return words.slice(0, 2).join(" ");
}

function bookUrl(slug: string) {
  if (typeof window === "undefined") return `/book/${slug}`;
  return `${window.location.origin}/book/${slug}`;
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

function addDayKey(key: string, days: number) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function weekdayShort(key: string, timeZone?: string | null) {
  const [y, m, d] = key.split("-").map(Number);
  const noon = new Date(Date.UTC(y, m - 1, d, 17));
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || undefined,
    weekday: "short",
  }).format(noon);
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
  if (visual.kind === "waiting" && visual.guestName) {
    const svc = currentAppt ? shortService(currentAppt.service.name) : "service";
    return `In chair · ${svc.toLowerCase()}`;
  }
  if (wait.kind === "waiting" && wait.waitMs > 0) {
    const mins = Math.max(1, Math.ceil(wait.waitMs / 60_000));
    return `Processing · ${mins} min`;
  }
  if (wait.freeMin != null && visual.kind !== "available" && visual.kind !== "waiting") {
    return `Next guest ${formatMinutesClock(wait.freeMin)}`;
  }
  if (wait.kind === "waiting" && wait.freeMin != null) {
    return `Next guest ${formatMinutesClock(wait.freeMin)}`;
  }
  if (wait.kind === "opens") return wait.label;
  if (wait.kind === "available") return "Ready for walk-ins";
  if (wait.kind === "done") return "Done for today";
  if (wait.kind === "closed") return "Closed";
  return wait.label;
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
  offerLine,
  wifiName,
  looks = [],
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
}) {
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
  const [origin, setOrigin] = useState("");
  const [teamPage, setTeamPage] = useState(0);
  const [lookPage, setLookPage] = useState(0);
  const [retailPage, setRetailPage] = useState(0);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

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
  const tomorrowKey = addDayKey(todayKeyStr, 1);

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

  const teamPageCount = Math.max(1, Math.ceil(Math.max(floor.length, 1) / TEAM_PAGE_SIZE));

  useEffect(() => {
    setTeamPage((p) => (teamPageCount ? p % teamPageCount : 0));
  }, [teamPageCount, floor.length]);

  useEffect(() => {
    if (teamPageCount < 2 || drag) return;
    const timer = window.setInterval(() => {
      setTeamPage((p) => (p + 1) % teamPageCount);
    }, TEAM_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [teamPageCount, drag]);

  const teamVisible = floor.slice(
    teamPage * TEAM_PAGE_SIZE,
    teamPage * TEAM_PAGE_SIZE + TEAM_PAGE_SIZE
  );

  const stats = loungeFloorStats(
    floor.map(({ wait, visual }) => ({
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

  const primeTomorrow = appointments
    .filter((a) => dayKey(a.startsAt, timeZone) === tomorrowKey && a.status === "BOOKED")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0];

  const ctaServices = useMemo(() => {
    const picks = services.slice(0, 3);
    if (picks.length) return picks.map((s) => s.name.toUpperCase());
    return ["WALK-IN WELCOME", "GLOSS & TRIM", "KERATIN CARE"];
  }, [services]);

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
  const bookingHref = slug ? (origin ? `${origin}/book/${slug}` : bookUrl(slug)) : "";
  const bookingLabel = slug
    ? `${(origin || "book.beautyzent.com").replace(/^https?:\/\//, "")}/book/${slug}`
    : "Scan at reception";
  const wifi = wifiName || (salonName ? `${firstName(salonName)}Guest` : "GuestWiFi");
  const offer =
    offerLine ||
    (stats.avgWaitMs > 0
      ? `Avg wait ${formatWaitMinutes(stats.avgWaitMs)}`
      : "Walk-ins welcome today");

  const padClass = compactPad ? "lounge-v2--compact" : "";

  return (
    <div className={`lounge-v2 ${padClass}`} data-testid="customer-lounge-board">
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
            data-team-count={floor.length}
          >
            {teamVisible.map(({ stylist, items, wait, visual, seated }) => {
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

              return (
                <article
                  key={stylist.id}
                  data-stylist-column={stylist.id}
                  className="lounge-v2-stylist"
                >
                  <div
                    className={`customer-stylist-photo-ring lounge-v2-stylist__photo overflow-hidden rounded-full ring-offset-2 ring-offset-[var(--cd-panel)] ${stylistStatusRingClass(
                      visual.kind
                    )}`}
                    data-testid="stylist-status-ring"
                    data-status-tone={stylistFloorTone(visual.kind)}
                    title={wait.label}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={stylist.photoUrl || "/avatars/stylist-neutral.svg"}
                      alt=""
                      className="h-full w-full object-cover"
                    />
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
            })}
          </div>
        </section>

        <section className="lounge-v2__col lounge-v2__col--center" aria-label="Next 90 minutes">
          <h2 className="lounge-v2__title">Your next 90 minutes</h2>
          <ol className="lounge-v2-timeline">
            <li className="lounge-v2-timeline__item is-now">
              <span className="lounge-v2-timeline__dot" aria-hidden />
              <div>
                <p className="lounge-v2-timeline__label">Now</p>
                <p className="lounge-v2-timeline__head">
                  {seatedNow
                    ? `${firstName(seatedNow.stylist.name)} finishing`
                    : storeClosed
                      ? "Salon closed"
                      : "Floor is open"}
                </p>
                <p className="lounge-v2-timeline__sub">
                  {seatedNow
                    ? `Finishing ${seatedNow.service.name.toLowerCase()}. Almost done.`
                    : stats.availableCount > 0
                      ? "Walk-ins welcome — a chair is ready."
                      : "Guests are in chair. Next opening soon."}
                </p>
              </div>
            </li>
            <li className="lounge-v2-timeline__item">
              <span className="lounge-v2-timeline__dot" aria-hidden />
              <div>
                <p className="lounge-v2-timeline__label">Up next</p>
                <p className="lounge-v2-timeline__head">
                  {upNext ? upNext.service.name : "Open for walk-ins"}
                  {upNext ? (
                    <span className="lounge-v2-timeline__aside">
                      {formatClock(upNext.startsAt, timeZone)}
                      {typeof upNext.service.priceCents === "number"
                        ? ` · ${money(upNext.service.priceCents)}`
                        : ""}
                    </span>
                  ) : null}
                </p>
              </div>
            </li>
            <li className="lounge-v2-timeline__item">
              <span className="lounge-v2-timeline__dot" aria-hidden />
              <div>
                <p className="lounge-v2-timeline__label">Prime tomorrow</p>
                <p className="lounge-v2-timeline__head">
                  {primeTomorrow
                    ? `${weekdayShort(tomorrowKey, timeZone)} ${formatClock(
                        primeTomorrow.startsAt,
                        timeZone
                      )} · ${primeTomorrow.service.name}`
                    : "Book tomorrow’s prime slots"}
                </p>
              </div>
            </li>
          </ol>

          <div className="lounge-v2-ctas">
            {ctaServices.map((label) => (
              <span key={label} className="lounge-v2-cta">
                {label}
              </span>
            ))}
          </div>

          <div className="lounge-v2-book">
            {bookingHref ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="lounge-v2-book__qr"
                src={qrSrc(bookingHref, 148)}
                alt="QR code to book online"
                width={148}
                height={148}
              />
            ) : (
              <div className="lounge-v2-book__qr lounge-v2-book__qr--empty" aria-hidden />
            )}
            <div>
              <p className="lounge-v2-book__title">Scan to book</p>
              <p className="lounge-v2-book__url">{bookingLabel}</p>
            </div>
          </div>

          <div className="lounge-v2-meta">
            <span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
                <path d="M12 7.5v5l3.2 1.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              Avg wait {formatWaitMinutes(stats.avgWaitMs)}
            </span>
            <span>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M7 8.5h10l1.2 11H5.8L7 8.5Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 8.5c0-2.4 1.3-4 3-4s3 1.6 3 4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
              Offer: {offer}
            </span>
          </div>
        </section>

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
      </div>

      <footer className="lounge-v2-foot">
        <p>
          <span>Now playing</span> Chill Lounge
        </p>
        <p>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12.5c2.8-3.2 6-4.8 7-4.8s4.2 1.6 7 4.8"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d="M7.5 15c1.8-2 3.7-3 4.5-3s2.7 1 4.5 3"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="12" cy="18" r="1.2" fill="currentColor" />
          </svg>
          Wi-Fi: {wifi}
        </p>
        <p className="lounge-v2-foot__perk">
          <span aria-hidden>♛</span> Members earn 2× Monday color
        </p>
      </footer>

      {drag ? (
        <div className="customer-appt-drag-ghost" style={{ left: drag.x, top: drag.y }} aria-hidden>
          {drag.label}
        </div>
      ) : null}
    </div>
  );
}
