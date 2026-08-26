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
    createdAt?: string | null;
    visitCount?: number;
    recentVisits?: { serviceName: string; date: string }[];
  };
  service: { name: string; priceCents?: number; category?: string };
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

export function serviceKind(name: string): "cut" | "color" | "style" {
  const n = (name || "").toLowerCase();
  if (/\b(color|colour|balayage|bleach|highlight|gloss|dye|tint|root)\b/.test(n)) {
    return "color";
  }
  if (/\b(blowout|style|updo|comb|set|finish)\b/.test(n)) return "style";
  return "cut";
}

/** Same cut / color / style chips on reception and the customer TV. */
export function serviceCardTone(name: string) {
  const kind = serviceKind(name);
  if (kind === "color") return "bg-[#5b3d7a] text-[#f3e8ff]";
  if (kind === "style") return "bg-[#2f6b55] text-[#e8fff4]";
  return "bg-[#c45b7a] text-white";
}

export function specialtyFromBio(bio: string | null | undefined, name: string) {
  const line = (bio || "").split(/[.\n]/)[0]?.trim();
  if (line && line.length < 48) return line;
  return `${firstName(name)}'s chair`;
}

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
  if (tone === "available") return "ring-[3px] ring-[#22c55e]";
  if (tone === "busy") return "ring-[3px] ring-[#ef4444]";
  return "ring-[3px] ring-[#f59e0b]";
}

export function stylistStatusDotClass(kind: StylistWaitKind) {
  const tone = stylistFloorTone(kind);
  if (tone === "available") return "bg-[#22c55e]";
  if (tone === "busy") return "bg-[#ef4444]";
  return "bg-[#f59e0b]";
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
