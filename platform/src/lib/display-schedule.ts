export type DisplayStylist = {
  id: string;
  name: string;
  bio: string | null;
  color: string;
  photoUrl: string;
};

export type DisplayAppt = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  source?: string;
  notes: string | null;
  chargedCents?: number | null;
  tipCents?: number | null;
  client: {
    id?: string;
    name: string;
    phone: string | null;
    email?: string | null;
    notes?: string | null;
    photoUrl?: string | null;
    createdAt?: string | null;
    visitCount?: number;
    recentVisits?: { serviceName: string; date: string }[];
  };
  service: { id?: string; name: string; priceCents?: number; category?: string; durationMin?: number };
  stylist: { id?: string; name: string; color: string; photoUrl?: string; bio?: string | null };
};

export const HOUR_PX = 76;

/** Manager store hours: open 0–23, close 1–24 (24 = midnight). */
export function clampDisplayHours(openHour?: number | null, closeHour?: number | null) {
  const open = Number.isFinite(openHour) ? Math.max(0, Math.min(23, Math.round(openHour!))) : 9;
  let close = Number.isFinite(closeHour) ? Math.round(closeHour!) : 18;
  close = Math.max(open + 1, Math.min(24, close));
  return { openHour: open, closeHour: close };
}

export function hourMarks(openHour: number, closeHour: number) {
  const hours: number[] = [];
  for (let h = openHour; h < closeHour; h++) hours.push(h);
  return hours;
}

export function formatHourLabel(h: number) {
  if (h === 24 || h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:00 ${suffix}`;
}

export function firstName(full: string) {
  return (full || "Guest").trim().split(/\s+/)[0] || "Guest";
}

export function initials(full: string) {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "•";
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("");
}

export function clockParts(iso: string, timeZone?: string | null) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timeZone || undefined,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const hour = Number(parts.find((p) => p.type === "hour")?.value || 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value || 0);
  const second = Number(parts.find((p) => p.type === "second")?.value || 0);
  return { hour, minute, second, minutes: hour * 60 + minute };
}

export function formatClock(iso: string, timeZone?: string | null) {
  return new Date(iso).toLocaleTimeString("en-CA", {
    timeZone: timeZone || undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

export function serviceKind(name: string): "cut" | "color" | "style" | "nail" | "facial" | "other" {
  const n = (name || "").toLowerCase();
  if (/\b(mani|pedi|nail|polish|acrylic)\b/.test(n) || /\bgel\s*(mani|pedi|nail)\b/.test(n)) {
    return "nail";
  }
  // Skin / wax — but not when the service is clearly a haircut.
  if (
    /\b(facial|peel|mask|derm|hydrafacial)\b/.test(n) ||
    (/\b(wax|threading)\b/.test(n) && !/haircut|\bcut\b|\btrim\b|\bfade\b/.test(n))
  ) {
    return "facial";
  }
  if (/\b(color|colour|balayage|bleach|highlight|gloss|dye|tint|root)\b/.test(n)) {
    return "color";
  }
  // Cut before style so "haircut & style" / "cut and blow-dry" stay cuts.
  // Note: "haircut" does not match \bcut\b — match it explicitly.
  if (
    /haircut/.test(n) ||
    /\b(cut|trim|barber|fade|taper|bangs|clipper|buzz)\b/.test(n) ||
    (/\b(men'?s?|mens|gents?|gentleman)\b/.test(n) && /\b(hair|cut|trim)\b/.test(n))
  ) {
    return "cut";
  }
  // Bridal hair (without makeup) is a style service.
  if (/\bbridal\b/.test(n) && /\b(hair|updo|style)\b/.test(n)) {
    return "style";
  }
  if (/\b(blowout|blow-dry|blow dry|style|updo|comb|set|finish|silk press)\b/.test(n)) {
    return "style";
  }
  return "other";
}

/** Same cut / color / style chips on reception and the customer TV. */
export function serviceCardTone(name: string) {
  const kind = serviceKind(name);
  if (kind === "color") return "bg-[#fadadd] text-[#5c3a42]";
  if (kind === "style") return "bg-[#e0f2f1] text-[#2f4a48]";
  if (kind === "nail") return "bg-[#e8e4f8] text-[#3d3560]";
  if (kind === "facial") return "bg-[#f5ebe0] text-[#5a4535]";
  if (kind === "cut") return "bg-[#f5d0c5] text-[#5c3d32]";
  return "bg-[#e7f0f5] text-[#334850]";
}

export function specialtyFromBio(bio: string | null | undefined, name: string) {
  const line = (bio || "").split(/[.\n]/)[0]?.trim();
  if (line && line.length < 48) return line;
  return `${firstName(name)}'s chair`;
}

/** Premium specialty tags for the customer lounge (max 2). */
export function stylistSpecialtyBadges(bio: string | null | undefined, name: string): string[] {
  const text = `${bio || ""}`.toLowerCase();
  const badges: string[] = [];
  if (/bridal|wedding|bride/.test(text)) badges.push("Bridal Expert");
  if (/color|colour|balayage|highlight|bleach|toner/.test(text)) badges.push("Color Specialist");
  if (/senior|lead|master|director/.test(text)) badges.push("Senior Stylist");
  if (/cut|barber|fade|men'?s/.test(text) && !badges.includes("Color Specialist")) {
    badges.push("Cut Specialist");
  }
  if (/extension|kerati/.test(text)) badges.push("Extensions");
  if (!badges.length) {
    const line = specialtyFromBio(bio, name);
    if (line && !line.toLowerCase().endsWith("'s chair")) badges.push(line);
    else badges.push("Stylist");
  }
  return badges.slice(0, 2);
}

/** Soft rotating lines when the floor is open and quiet. */
export const LOUNGE_CALM_QUOTES = [
  "Take a seat — beauty starts here.",
  "Soft light. Soft music. You’re welcome.",
  "Walk-ins welcome. Your chair is waiting.",
  "Breathe in. Glow out.",
  "Relax — we’re glad you’re here.",
];

export function statusLabel(status: string) {
  if (status === "CHECKED_IN") return "Checked In";
  if (status === "BOOKED") return "Confirmed";
  if (status === "COMPLETED") return "Completed";
  return status.replaceAll("_", " ");
}

/** Playwright provisioned chairs — hide from salon TV / public booking. */
export function isE2eFixtureStylist(s: { name?: string | null; bio?: string | null }) {
  return /e2e provisioned/i.test(s.bio || "") || /^[A-Za-z0-9]{6,}\s+stylist$/i.test(s.name || "");
}

const CHAIR_BUSY = new Set(["BOOKED", "CHECKED_IN"]);

export type StylistWaitKind = "available" | "waiting" | "opens" | "closed" | "done";

/** Photo-ring tones: free / in chair / not taking guests. */
export type StylistFloorTone = "available" | "busy" | "off";

export type StylistWaitInfo = {
  kind: StylistWaitKind;
  waitMs: number;
  freeMin: number | null;
  label: string;
  sublabel: string | null;
};

export function stylistFloorTone(kind: StylistWaitKind): StylistFloorTone {
  if (kind === "available") return "available";
  if (kind === "waiting") return "busy";
  return "off";
}

export function stylistStatusRingClass(kind: StylistWaitKind) {
  const tone = stylistFloorTone(kind);
  if (tone === "available") return "ring-[3px] ring-[#8fbfa4]";
  if (tone === "busy") return "ring-[3px] ring-[#e8a0aa]";
  return "ring-[3px] ring-[#c19a6b]";
}

export function stylistStatusDotClass(kind: StylistWaitKind) {
  const tone = stylistFloorTone(kind);
  if (tone === "available") return "bg-[#8fbfa4]";
  if (tone === "busy") return "bg-[#e8a0aa]";
  return "bg-[#c19a6b]";
}

export function formatMinutesClock(totalMin: number) {
  const wrapped = ((totalMin % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(wrapped / 60);
  const min = wrapped % 60;
  const mm = String(min).padStart(2, "0");
  if (h === 0 || h === 24) return `12:${mm} AM`;
  if (h === 12) return `12:${mm} PM`;
  const suffix = h > 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${mm} ${suffix}`;
}

export function formatWaitDuration(waitMs: number) {
  const totalSec = Math.max(0, Math.ceil(waitMs / 1000));
  if (totalSec <= 0) return "Available now";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return m > 0 ? `Wait ${h} hr ${m} min` : `Wait ${h} hr`;
  if (totalSec < 60) return `Wait ${s}s`;
  if (totalSec < 10 * 60) return `Wait ${m}:${String(s).padStart(2, "0")}`;
  return `Wait ${Math.ceil(totalSec / 60)} min`;
}

export function mergeBusyMinutes(
  appointments: Pick<DisplayAppt, "startsAt" | "endsAt" | "status">[],
  timeZone?: string | null
) {
  const ranges = appointments
    .filter((a) => CHAIR_BUSY.has(a.status))
    .map((a) => {
      const start = clockParts(a.startsAt, timeZone).minutes;
      let end = clockParts(a.endsAt, timeZone).minutes;
      if (end <= start) end += 24 * 60;
      return { start, end };
    })
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  const merged: { start: number; end: number }[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (!last || r.start > last.end) merged.push({ ...r });
    else last.end = Math.max(last.end, r.end);
  }
  return merged;
}

/** Earliest minutes-from-midnight the chair is free, walking contiguous busy blocks. */
export function stylistEarliestFreeMin(
  appointments: Pick<DisplayAppt, "startsAt" | "endsAt" | "status">[],
  nowMin: number,
  openMin: number,
  timeZone?: string | null
) {
  const busy = mergeBusyMinutes(appointments, timeZone);
  let t = Math.max(nowMin, openMin);
  for (const b of busy) {
    if (b.end <= t) continue;
    if (b.start > t) break;
    t = b.end;
  }
  return t;
}

export function stylistWaitInfo(
  appointments: Pick<DisplayAppt, "startsAt" | "endsAt" | "status">[],
  now: Date,
  openHour: number,
  closeHour: number,
  timeZone?: string | null,
  storeClosed?: boolean
): StylistWaitInfo {
  if (storeClosed) {
    return { kind: "closed", waitMs: 0, freeMin: null, label: "Closed today", sublabel: null };
  }

  const parts = clockParts(now.toISOString(), timeZone);
  const nowMin = parts.minutes;
  const nowSec = parts.second ?? 0;
  const openMin = openHour * 60;
  const closeMin = closeHour * 60;
  const busy = mergeBusyMinutes(appointments, timeZone);
  const inChairNow = busy.some((b) => b.start <= nowMin && nowMin < b.end);
  const freeMin = stylistEarliestFreeMin(appointments, nowMin, openMin, timeZone);

  if (nowMin >= closeMin && !inChairNow) {
    return { kind: "closed", waitMs: 0, freeMin: null, label: "Closed", sublabel: null };
  }

  if (freeMin >= closeMin && !inChairNow) {
    return { kind: "done", waitMs: 0, freeMin: null, label: "Done for today", sublabel: null };
  }

  const waitMin = Math.max(0, freeMin - nowMin);
  const waitMs = Math.max(0, waitMin * 60_000 - nowSec * 1000);

  if (waitMin <= 0) {
    return { kind: "available", waitMs: 0, freeMin, label: "Available now", sublabel: null };
  }

  if (nowMin < openMin && freeMin === openMin) {
    return {
      kind: "opens",
      waitMs,
      freeMin,
      label: `Opens ${formatMinutesClock(openMin)}`,
      sublabel: null,
    };
  }

  return {
    kind: "waiting",
    waitMs,
    freeMin,
    label: formatWaitDuration(waitMs),
    sublabel: formatMinutesClock(freeMin),
  };
}

/** Guest in the chair after check-in. BOOKED on the timeline is not seated yet. */
export function stylistCurrentGuest(
  appointments: Pick<DisplayAppt, "startsAt" | "endsAt" | "status" | "client">[],
  now: Date,
  timeZone?: string | null
): string | null {
  const nowMin = clockParts(now.toISOString(), timeZone).minutes;
  const checkedIn = appointments.filter((a) => a.status === "CHECKED_IN");
  if (!checkedIn.length) return null;

  const withRange = checkedIn.map((a) => {
    const start = clockParts(a.startsAt, timeZone).minutes;
    let end = clockParts(a.endsAt, timeZone).minutes;
    if (end <= start) end += 24 * 60;
    return { start, end, name: a.client.name };
  });
  const overlapping = withRange.filter((a) => a.start <= nowMin && nowMin < a.end);
  const pool = overlapping.length ? overlapping : withRange;
  pool.sort((a, b) => a.start - b.start);
  return pool[0]?.name ?? null;
}

/** Chair neon: seated (checked-in) is busy; a booked-but-not-seated slot stays Available. */
export function stylistChairVisual(
  wait: StylistWaitInfo,
  seatedName: string | null
): { kind: StylistWaitKind; guestName: string | null } {
  if (seatedName) return { kind: "waiting", guestName: seatedName };
  if (wait.kind === "waiting") return { kind: "available", guestName: null };
  return { kind: wait.kind, guestName: null };
}

export function canChairCheckIn(status: string) {
  return status === "BOOKED";
}

/** A chair only accepts a booked card when it is Available. */
export function chairAcceptsDrop(kind: StylistWaitKind, _sameStylist?: boolean) {
  return kind === "available";
}

/** ~3 hour window around now, snapped to :00 / :30, inside store hours. */
export function loungeTimeWindow(nowMin: number, openMin: number, closeMin: number) {
  const span = 180;
  const aligned = Math.floor(nowMin / 30) * 30;
  let start = Math.max(openMin, aligned - 60);
  let end = start + span;
  if (end > closeMin) {
    end = closeMin;
    start = Math.max(openMin, end - span);
  }
  if (end <= start) end = start + 30;
  const marks: number[] = [];
  for (let t = start; t <= end; t += 30) marks.push(t);
  return { start, end, marks };
}

export function loungeFloorStats(waits: Pick<StylistWaitInfo, "kind" | "waitMs">[]) {
  const active = waits.filter((w) => w.kind !== "closed" && w.kind !== "done");
  const availableCount = waits.filter((w) => w.kind === "available").length;
  const nextWaitMs = active.length ? Math.min(...active.map((w) => w.waitMs)) : 0;
  const avgWaitMs = active.length
    ? Math.round(active.reduce((sum, w) => sum + w.waitMs, 0) / active.length)
    : 0;
  return { availableCount, total: waits.length, nextWaitMs, avgWaitMs };
}

export function loungeStatusLine(
  storeClosed: boolean,
  stats: { availableCount: number; total: number }
) {
  if (storeClosed) return "Closed today";
  if (stats.availableCount === stats.total && stats.total > 0) {
    return "All stylists available • Walk-ins welcome";
  }
  if (stats.availableCount === 0) return "All chairs busy • Next opening soon";
  return `${stats.availableCount} chair${stats.availableCount === 1 ? "" : "s"} open • Walk-ins welcome`;
}

export function formatWaitMinutes(ms: number) {
  return `${Math.max(0, Math.ceil(ms / 60_000))} min`;
}

function joinOpeningNames(names: string[]) {
  if (names.length <= 1) return names[0] || "Chair";
  if (names.length === 2) return `${names[0]} & ${names[1]}`;
  return `${names[0]} +${names.length - 1}`;
}

/** Rotating one-liners for the customer display header (hours, wait, availability). */
export function loungeHeadlineSlides(input: {
  appointments: DisplayAppt[];
  stylists: DisplayStylist[];
  openHour: number;
  closeHour: number;
  timeZone?: string | null;
  now: Date;
  storeClosed?: boolean;
}): string[] {
  const { appointments, openHour, closeHour, timeZone, now, storeClosed } = input;
  if (storeClosed) return ["Closed today"];

  const columns = input.stylists.length
    ? input.stylists
    : [{ id: "none", name: "Chair", bio: null, color: "#c9a87c", photoUrl: "" }];
  const nowMin = clockParts(now.toISOString(), timeZone).minutes;
  const floor = columns.map((stylist) => {
    const items = appointments.filter(
      (a) => a.stylist.id === stylist.id || a.stylist.name === stylist.name
    );
    const wait = stylistWaitInfo(items, now, openHour, closeHour, timeZone, storeClosed);
    const visual = stylistChairVisual(wait, stylistCurrentGuest(items, now, timeZone));
    return { stylist, wait, visual };
  });
  const stats = loungeFloorStats(
    floor.map(({ wait, visual }) => ({
      kind: visual.kind,
      waitMs: visual.kind === "available" ? 0 : wait.waitMs,
    }))
  );

  const slides: string[] = [
    `${formatHourLabel(openHour)} – ${formatHourLabel(closeHour)}`,
    loungeStatusLine(false, stats),
  ];

  if (stats.total > 0) {
    slides.push(`Next available in ${formatWaitMinutes(stats.nextWaitMs)}`);
    slides.push(`Average wait ${formatWaitMinutes(stats.avgWaitMs)}`);
  }

  const byMin = new Map<number, string[]>();
  for (const { stylist, wait, visual } of floor) {
    if (visual.kind !== "waiting" && visual.kind !== "opens") continue;
    const freeMin = wait.freeMin;
    if (freeMin == null || freeMin <= nowMin) continue;
    const names = byMin.get(freeMin) || [];
    names.push(firstName(stylist.name));
    byMin.set(freeMin, names);
  }
  for (const [freeMin, names] of [...byMin.entries()].sort((a, b) => a[0] - b[0])) {
    slides.push(`${joinOpeningNames(names)} free at ${formatMinutesClock(freeMin)}`);
  }

  return slides;
}

/**
 * If the guest sits before the booked start, slide the window so duration
 * stays the same (a 5–6pm cut seated at 4pm becomes 4–5pm, not 4–6pm).
 */
export function earlySeatWindow(
  startsAt: Date | string,
  endsAt: Date | string,
  now: Date = new Date()
): { startsAt: Date; endsAt: Date } | null {
  const start = startsAt instanceof Date ? startsAt : new Date(startsAt);
  const end = endsAt instanceof Date ? endsAt : new Date(endsAt);
  const durationMs = end.getTime() - start.getTime();
  if (!Number.isFinite(durationMs) || durationMs <= 0) return null;
  if (now.getTime() >= start.getTime()) return null;
  return {
    startsAt: now,
    endsAt: new Date(now.getTime() + durationMs),
  };
}

/** Progress of a seated (CHECKED_IN) service for the Now Serving ring. */
export function seatedServiceProgress(
  appt: Pick<DisplayAppt, "startsAt" | "endsAt">,
  now: Date = new Date()
): { progress: number; remainingMs: number; remainingLabel: string } {
  const early = earlySeatWindow(appt.startsAt, appt.endsAt, now);
  const start = early?.startsAt ?? new Date(appt.startsAt);
  const end = early?.endsAt ?? new Date(appt.endsAt);
  const total = Math.max(1, end.getTime() - start.getTime());
  const elapsed = Math.max(0, now.getTime() - start.getTime());
  const progress = Math.min(1, elapsed / total);
  const remainingMs = Math.max(0, end.getTime() - now.getTime());
  const mins = Math.max(0, Math.ceil(remainingMs / 60_000));
  return {
    progress,
    remainingMs,
    remainingLabel: mins <= 0 ? "Wrapping up" : `~${mins} min left`,
  };
}

/** Pixel box for a timeline card. CHECKED_IN fills from Now for the booked duration. */
export function timelineCardBox(
  appt: Pick<DisplayAppt, "startsAt" | "endsAt" | "status">,
  now: Date,
  openMin: number,
  spanMin: number,
  columnHeight: number,
  minHeight: number,
  timeZone?: string | null
): { top: number; height: number; onChair: boolean } {
  const startMin = clockParts(appt.startsAt, timeZone).minutes;
  let endMin = clockParts(appt.endsAt, timeZone).minutes;
  if (endMin <= startMin) endMin += 24 * 60;
  const durationMin = endMin - startMin;
  const nowMin = clockParts(now.toISOString(), timeZone).minutes;
  const closeMin = openMin + spanMin;
  const onChair = appt.status === "CHECKED_IN";
  const toY = (min: number) => ((min - openMin) / spanMin) * columnHeight;
  const clampTop = (y: number) => Math.max(0, Math.min(y, Math.max(0, columnHeight - minHeight)));

  let visStart = startMin;
  let visEnd = endMin;
  if (onChair) {
    // Stay inside today's open hours so a late-night / early-morning check-in
    // cannot paint a card above the stylist + chair header.
    visStart = Math.min(Math.max(nowMin, openMin), closeMin);
    // Early seat: keep the booked length. Late seat: remaining time to endsAt.
    visEnd = visStart < startMin ? visStart + durationMin : endMin;
    if (visEnd <= visStart) {
      return { top: clampTop(toY(visStart)), height: minHeight, onChair: true };
    }
  }

  const top = clampTop(toY(visStart));
  const rawH = Math.min(toY(visEnd), columnHeight) - top - 6;
  return { top, height: Math.max(minHeight, rawH), onChair };
}

/** Compact chair caption: guest first name when seated, else a short wait/off label. */
export function stylistChairCaption(wait: StylistWaitInfo, guestFullName?: string | null): string {
  if (wait.kind === "available") return "Available";
  if (wait.kind === "waiting") {
    const name = guestFullName ? firstName(guestFullName) : null;
    return name || "Busy";
  }
  if (wait.kind === "done") return "Off";
  return wait.label;
}
