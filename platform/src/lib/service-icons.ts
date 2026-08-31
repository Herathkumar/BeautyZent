/** Pre-generated line icons for marketplace service cards. Salon first; add more trades later. */

export type ServiceIconPack = "salon";

export type ServiceIconId =
  | "haircut"
  | "coloring"
  | "eyebrow"
  | "fade"
  | "beard"
  | "blowdry"
  | "trim"
  | "bangs"
  | "facial"
  | "nails"
  | "massage"
  | "default";

const SALON_ICONS: Record<ServiceIconId, string> = {
  haircut: "/service-icons/salon/haircut.svg",
  coloring: "/service-icons/salon/coloring.svg",
  eyebrow: "/service-icons/salon/eyebrow.svg",
  fade: "/service-icons/salon/fade.svg",
  beard: "/service-icons/salon/beard.svg",
  blowdry: "/service-icons/salon/blowdry.svg",
  trim: "/service-icons/salon/trim.svg",
  bangs: "/service-icons/salon/bangs.svg",
  facial: "/service-icons/salon/facial.svg",
  nails: "/service-icons/salon/nails.svg",
  massage: "/service-icons/salon/massage.svg",
  default: "/service-icons/salon/default.svg",
};

const RULES: Array<{ id: ServiceIconId; match: RegExp }> = [
  { id: "eyebrow", match: /\b(eyebrow|brow|lash|eyelash)\b/i },
  { id: "beard", match: /\b(beard|mustache|moustache|shave)\b/i },
  { id: "bangs", match: /\b(bang|fringe)\b/i },
  { id: "fade", match: /\b(fade|taper|clipper|skin fade)\b/i },
  { id: "coloring", match: /\b(colour|color|balayage|highlight|tint|dye|bleach)\b/i },
  { id: "blowdry", match: /\b(blow.?dry|blowout|blow out)\b/i },
  { id: "trim", match: /\b(trim|tidy)\b/i },
  { id: "facial", match: /\b(facial|skin|cleanup|cleanse)\b/i },
  { id: "nails", match: /\b(nail|manicure|pedicure)\b/i },
  { id: "massage", match: /\b(massage|spa|head spa)\b/i },
  { id: "haircut", match: /\b(haircut|hair cut|cut)\b/i },
];

export function serviceIconSrc(
  name: string,
  pack: ServiceIconPack = "salon"
): string {
  const id = RULES.find((rule) => rule.match.test(name))?.id ?? "default";
  if (pack === "salon") return SALON_ICONS[id];
  return SALON_ICONS.default;
}
