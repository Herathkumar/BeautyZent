import { serviceKind } from "@/lib/display-schedule";

/** Apple Calendar–style flashy pastels — saturated fills, readable ink. */
export type CalendarTone = {
  id: string;
  label: string;
  bg: string;
  text: string;
  badge: string;
  badgeText: string;
  /** Strong accent used for left stripe + month dots. */
  dot: string;
};

export const CALENDAR_TONES: Record<string, CalendarTone> = {
  color: {
    id: "color",
    label: "Cut / Color",
    bg: "#ffb4d6",
    text: "#6b1240",
    badge: "#ff7eb3",
    badgeText: "#5a0f36",
    dot: "#ff2d8a",
  },
  cut: {
    id: "cut",
    label: "Cut",
    bg: "#ffc9a8",
    text: "#7a2e0c",
    badge: "#ff9f6b",
    badgeText: "#6a2608",
    dot: "#ff6b2c",
  },
  fade: {
    id: "fade",
    label: "Barber",
    bg: "#ffe566",
    text: "#6b5200",
    badge: "#ffd11a",
    badgeText: "#5a4500",
    dot: "#f5c400",
  },
  makeup: {
    id: "makeup",
    label: "Makeup",
    bg: "#d4b5ff",
    text: "#3d1a7a",
    badge: "#b88cff",
    badgeText: "#321566",
    dot: "#8b4dff",
  },
  style: {
    id: "style",
    label: "Style",
    bg: "#7eecff",
    text: "#045a6b",
    badge: "#3ddfff",
    badgeText: "#034a58",
    dot: "#00c2e0",
  },
  nail: {
    id: "nail",
    label: "Nails",
    bg: "#ff9eef",
    text: "#7a0a66",
    badge: "#ff6ae3",
    badgeText: "#680857",
    dot: "#ff2ec8",
  },
  facial: {
    id: "facial",
    label: "Skin",
    bg: "#b8f5c8",
    text: "#0f5a2a",
    badge: "#7aeb9a",
    badgeText: "#0c4a22",
    dot: "#2dd66b",
  },
  paid: {
    id: "paid",
    label: "Paid",
    bg: "#9af0d8",
    text: "#0a5a48",
    badge: "#4de0bc",
    badgeText: "#084a3c",
    dot: "#00c9a0",
  },
  blocked: {
    id: "blocked",
    label: "Blocked",
    bg: "#d8d8dc",
    text: "#4a4a50",
    badge: "#c4c4c8",
    badgeText: "#3f3f44",
    dot: "#8e8e96",
  },
  other: {
    id: "other",
    label: "Other",
    bg: "#a8c8ff",
    text: "#0f2f7a",
    badge: "#6ea0ff",
    badgeText: "#0c2666",
    dot: "#2f6bff",
  },
};

export const MONTH_LEGEND: { tone: CalendarTone; label: string }[] = [
  { tone: CALENDAR_TONES.color!, label: "Cut / Color" },
  { tone: CALENDAR_TONES.cut!, label: "Cut" },
  { tone: CALENDAR_TONES.fade!, label: "Barber" },
  { tone: CALENDAR_TONES.makeup!, label: "Makeup" },
  { tone: CALENDAR_TONES.style!, label: "Style" },
  { tone: CALENDAR_TONES.paid!, label: "Paid" },
  { tone: CALENDAR_TONES.blocked!, label: "Blocked" },
];

const AVATAR_PASTELS = ["#b8f5c8", "#ffc9a8", "#7eecff", "#ffb4d6", "#ffe566", "#a8c8ff"];

export function stylistAvatarTone(index: number) {
  return AVATAR_PASTELS[Math.abs(index) % AVATAR_PASTELS.length]!;
}

export function appointmentCalendarTone(input: {
  serviceName: string;
  status?: string;
  source?: string;
}): CalendarTone {
  const name = (input.serviceName || "").toLowerCase();
  if (/\b(lunch|block|unavailable|break|time[\s-]?off)\b/.test(name) || input.source === "BLOCK") {
    return CALENDAR_TONES.blocked!;
  }
  if (input.status === "COMPLETED") {
    return CALENDAR_TONES.paid!;
  }
  // Makeup only for explicit makeup / lash / brow — not "bridal hair" or haircuts.
  if (
    /\b(makeup|make-up|glam)\b/.test(name) ||
    (/\b(lash|brow)\b/.test(name) && !/haircut|\bcut\b|\btrim\b|\bfade\b|\bhair\b/.test(name))
  ) {
    return CALENDAR_TONES.makeup!;
  }
  if (/\b(fade|beard|barber|shave|taper|clipper|buzz)\b/.test(name)) {
    return CALENDAR_TONES.fade!;
  }
  // Men's / gents hair services → Cut (or Barber if fade-like already handled).
  if (
    /haircut/.test(name) ||
    /\b(cut|trim)\b/.test(name) ||
    (/\b(men'?s?|mens|gents?|gentleman)\b/.test(name) && /\b(hair|cut|trim)\b/.test(name))
  ) {
    const kind = serviceKind(input.serviceName);
    if (kind === "color") return CALENDAR_TONES.color!;
    return CALENDAR_TONES.cut!;
  }
  const kind = serviceKind(input.serviceName);
  if (kind === "color") return CALENDAR_TONES.color!;
  if (kind === "cut") return CALENDAR_TONES.cut!;
  if (kind === "style") return CALENDAR_TONES.style!;
  if (kind === "nail") return CALENDAR_TONES.nail!;
  if (kind === "facial") return CALENDAR_TONES.facial!;
  return CALENDAR_TONES.other!;
}

export function statusPillLabel(status: string) {
  if (status === "CHECKED_IN") return "In chair";
  if (status === "BOOKED") return "Confirmed";
  if (status === "COMPLETED") return "Paid";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "NO_SHOW") return "No show";
  return status.replaceAll("_", " ");
}
