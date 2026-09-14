import { serviceKind } from "@/lib/display-schedule";

/** Apple Calendar–style pastel tones from the BeautyZent stylist mockups. */
export type CalendarTone = {
  id: string;
  label: string;
  bg: string;
  text: string;
  badge: string;
  badgeText: string;
  dot: string;
};

export const CALENDAR_TONES: Record<string, CalendarTone> = {
  color: {
    id: "color",
    label: "Cut / Color",
    bg: "#fadadd",
    text: "#5c3a42",
    badge: "#f0c4cb",
    badgeText: "#6b3f48",
    dot: "#e8a0aa",
  },
  cut: {
    id: "cut",
    label: "Cut",
    bg: "#f5d0c5",
    text: "#5c3d32",
    badge: "#ebc0b2",
    badgeText: "#6a4538",
    dot: "#e0a894",
  },
  fade: {
    id: "fade",
    label: "Barber",
    bg: "#e8dfc4",
    text: "#4a4530",
    badge: "#d9cfa8",
    badgeText: "#524c34",
    dot: "#c9b87a",
  },
  makeup: {
    id: "makeup",
    label: "Makeup",
    bg: "#d8ebe0",
    text: "#2f4a3a",
    badge: "#c2ddd0",
    badgeText: "#355545",
    dot: "#8fbfa4",
  },
  style: {
    id: "style",
    label: "Style",
    bg: "#e0f2f1",
    text: "#2f4a48",
    badge: "#c8e4e2",
    badgeText: "#355553",
    dot: "#7ebdb8",
  },
  nail: {
    id: "nail",
    label: "Nails",
    bg: "#e8e4f8",
    text: "#3d3560",
    badge: "#d4cef0",
    badgeText: "#453d6e",
    dot: "#a89ad4",
  },
  facial: {
    id: "facial",
    label: "Skin",
    bg: "#f5ebe0",
    text: "#5a4535",
    badge: "#ead9c8",
    badgeText: "#634c3a",
    dot: "#d4b896",
  },
  paid: {
    id: "paid",
    label: "Paid",
    bg: "#d8ebe0",
    text: "#2f4a3a",
    badge: "#c2ddd0",
    badgeText: "#355545",
    dot: "#4f9e91",
  },
  blocked: {
    id: "blocked",
    label: "Blocked",
    bg: "#ececeb",
    text: "#5a5a58",
    badge: "#dcdcdb",
    badgeText: "#555553",
    dot: "#b0b0ae",
  },
  other: {
    id: "other",
    label: "Other",
    bg: "#e7f0f5",
    text: "#334850",
    badge: "#d2e2ea",
    badgeText: "#3a525c",
    dot: "#8aa8b8",
  },
};

export const MONTH_LEGEND: { tone: CalendarTone; label: string }[] = [
  { tone: CALENDAR_TONES.color!, label: "Cut / Color" },
  { tone: CALENDAR_TONES.paid!, label: "Paid services" },
  { tone: CALENDAR_TONES.makeup!, label: "Makeup" },
  { tone: CALENDAR_TONES.blocked!, label: "Blocked" },
];

const AVATAR_PASTELS = ["#d8ebe0", "#f5ebe0", "#e8e4f8", "#fadadd", "#e0f2f1", "#efe4cf"];

export function stylistAvatarTone(index: number) {
  return AVATAR_PASTELS[Math.abs(index) % AVATAR_PASTELS.length]!;
}

export function appointmentCalendarTone(input: {
  serviceName: string;
  status?: string;
  source?: string;
}): CalendarTone {
  const name = (input.serviceName || "").toLowerCase();
  if (/\b(lunch|block|unavailable|break|time off)\b/.test(name) || input.source === "BLOCK") {
    return CALENDAR_TONES.blocked!;
  }
  if (input.status === "COMPLETED") {
    return CALENDAR_TONES.paid!;
  }
  if (/\b(makeup|bridal|lash|brow)\b/.test(name)) return CALENDAR_TONES.makeup!;
  if (/\b(fade|beard|barber|shave)\b/.test(name)) return CALENDAR_TONES.fade!;
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
