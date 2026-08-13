/**
 * Salon theme packs — one pack drives the booking, manager, and stylist apps.
 *
 * Each pack ships a dark palette and its light companion; the in-app light/dark
 * toggle flips between the two. Palettes are emitted as `--t-*` CSS variables
 * (see scripts/build-salon-themes.ts → src/app/salon-themes.css) so component
 * styles stay colour-agnostic.
 */

export type ThemePaletteInput = {
  /** Page gradient: top → middle → bottom. */
  bg1: string;
  bg2: string;
  bg3: string;
  /** Cards, raised chrome (header/dropdown/sticky bars), sunken fields. */
  surface1: string;
  surface2: string;
  surface3: string;
  /** Decorative stat-card tints; default to accent/ok/warn washes over surface1. */
  tint1?: string;
  tint2?: string;
  tint3?: string;
  accent: string;
  /** Brighter companion (secondary headings, gradient starts). */
  accentStrong: string;
  /** Darker companion (gradient ends, pressed states). */
  accentDeep: string;
  /** Brightest accent, used for hovers. */
  accentLift: string;
  /** Pale accent wash used behind selected rows/cards. */
  accentTint: string;
  /** Readable text on an accent fill. */
  onAccent: string;
  text: string;
  textSoft: string;
  muted: string;
  ok: string;
  warn: string;
  danger: string;
  /** Base of drop shadows; defaults to black on dark packs, ink on light packs. */
  shadow?: string;
  /** Radial glow tints behind the page gradient; default to the accents. */
  glow1?: string;
  glow2?: string;
};

export type ThemePalette = Required<ThemePaletteInput>;

export type SalonTheme = {
  id: string;
  label: string;
  blurb: string;
  dark: ThemePalette;
  light: ThemePalette;
};

/* -------------------------------------------------------------------------- */
/* Colour helpers                                                             */
/* -------------------------------------------------------------------------- */

function toRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.replace(/./g, (c) => c + c) : raw;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function toHex([r, g, b]: [number, number, number]) {
  const part = (n: number) => Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

function mix(a: string, b: string, amount: number) {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return toHex([
    r1 + (r2 - r1) * amount,
    g1 + (g2 - g1) * amount,
    b1 + (b2 - b1) * amount,
  ]);
}

function isDarkColor(hex: string) {
  const [r, g, b] = toRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

/** "#f0c987" → "240 201 135" for `rgb(var(--x) / 0.4)` alpha use. */
export function rgbTriplet(hex: string) {
  return toRgb(hex).join(" ");
}

function palette(input: ThemePaletteInput): ThemePalette {
  const dark = isDarkColor(input.bg2);
  return {
    ...input,
    tint1: input.tint1 ?? mix(input.surface1, input.accent, dark ? 0.14 : 0.08),
    tint2: input.tint2 ?? mix(input.surface1, input.ok, dark ? 0.14 : 0.08),
    tint3: input.tint3 ?? mix(input.surface1, input.warn, dark ? 0.14 : 0.08),
    shadow: input.shadow ?? (dark ? "#000000" : input.text),
    glow1: input.glow1 ?? input.accent,
    glow2: input.glow2 ?? input.accentDeep,
  };
}

/* -------------------------------------------------------------------------- */
/* The packs                                                                  */
/* -------------------------------------------------------------------------- */

export const SALON_THEMES: SalonTheme[] = [
  {
    id: "cocoa",
    label: "Cocoa & Gold",
    blurb: "Warm brown and champagne — the original Farzana look.",
    dark: palette({
      bg1: "#241c18",
      bg2: "#1c1714",
      bg3: "#15110f",
      surface1: "#2a211c",
      surface2: "#322821",
      surface3: "#15110f",
      accent: "#f0c987",
      accentStrong: "#f6d6a0",
      accentDeep: "#c9a87c",
      accentLift: "#f6d6a0",
      accentTint: "#3a2c24",
      onAccent: "#1c1714",
      text: "#fffaf6",
      textSoft: "#e8ddd0",
      muted: "#a89a8c",
      ok: "#9fe3b8",
      warn: "#e0986c",
      danger: "#f5a8a8",
      glow2: "#6e4a38",
    }),
    light: palette({
      bg1: "#f7f1ea",
      bg2: "#f3ebe3",
      bg3: "#ebe2d8",
      surface1: "#ffffff",
      surface2: "#fffcf9",
      surface3: "#faf6f1",
      accent: "#7d6154",
      accentStrong: "#8c6f5a",
      accentDeep: "#6e4a38",
      accentLift: "#a08270",
      accentTint: "#f8efe6",
      onAccent: "#fffcf9",
      text: "#2b2521",
      textSoft: "#3d342e",
      muted: "#5c4f47",
      ok: "#2f7a4f",
      warn: "#c47a4a",
      danger: "#b54a3c",
      glow2: "#8c6f5a",
    }),
  },
  {
    id: "plum",
    label: "Plum & Lilac",
    blurb: "Deep plum night with a lilac-mist day — soft and boutique.",
    dark: palette({
      bg1: "#22182e",
      bg2: "#17121f",
      bg3: "#100c16",
      surface1: "#2a2434",
      surface2: "#35264a",
      surface3: "#22182e",
      accent: "#c9b4e8",
      accentStrong: "#e0d0f5",
      accentDeep: "#9b7ec4",
      accentLift: "#e0d0f5",
      accentTint: "#35264a",
      onAccent: "#17121f",
      text: "#f8f4fc",
      textSoft: "#e8dff4",
      muted: "#b5a6c8",
      ok: "#9fe3b8",
      warn: "#e0986c",
      danger: "#f5a8a8",
      glow2: "#583882",
    }),
    light: palette({
      bg1: "#fcfaff",
      bg2: "#f7f3fb",
      bg3: "#efe8f7",
      surface1: "#ffffff",
      surface2: "#fcfaff",
      surface3: "#f3ecfb",
      accent: "#6b4ea8",
      accentStrong: "#7a5ab8",
      accentDeep: "#553c88",
      accentLift: "#9b7ed4",
      accentTint: "#f3ecfb",
      onAccent: "#fcfaff",
      text: "#2a2434",
      textSoft: "#3d3548",
      muted: "#6d6280",
      ok: "#2f7a4f",
      warn: "#c47a4a",
      danger: "#b54a3c",
    }),
  },
  {
    id: "seaglass",
    label: "Sea Glass",
    blurb: "Cool teal on near-black, with a bright mint mist companion.",
    dark: palette({
      bg1: "#152226",
      bg2: "#0e1618",
      bg3: "#0a1114",
      surface1: "#1a282c",
      surface2: "#1f3a3a",
      surface3: "#10181c",
      tint1: "#243848",
      tint2: "#1e3f36",
      tint3: "#2a4038",
      accent: "#7ec4b8",
      accentStrong: "#b5ebe0",
      accentDeep: "#4f9e91",
      accentLift: "#c8f2ea",
      accentTint: "#1f3a3a",
      onAccent: "#0e1618",
      text: "#f4fbfa",
      textSoft: "#d7ebe7",
      muted: "#8fa8a4",
      ok: "#9fe3b8",
      warn: "#e0986c",
      danger: "#f5a8a8",
      glow2: "#386e78",
    }),
    light: palette({
      bg1: "#f4fbfa",
      bg2: "#e8f4f1",
      bg3: "#dceee9",
      surface1: "#ffffff",
      surface2: "#f7fcfb",
      surface3: "#f0faf7",
      accent: "#2a8f82",
      accentStrong: "#3aa897",
      accentDeep: "#1f7a6e",
      accentLift: "#48b5a4",
      accentTint: "#e0f3ef",
      onAccent: "#f4fbfa",
      text: "#0e1618",
      textSoft: "#1a2c30",
      muted: "#5a726e",
      ok: "#2f7a4f",
      warn: "#c47a4a",
      danger: "#b54a3c",
      glow2: "#386e78",
    }),
  },
  {
    id: "noir",
    label: "Noir & Pearl",
    blurb: "Editorial charcoal with warm pearl type — quiet and premium.",
    dark: palette({
      bg1: "#23242a",
      bg2: "#17181c",
      bg3: "#0f1013",
      surface1: "#22242a",
      surface2: "#2c2f36",
      surface3: "#131418",
      accent: "#d8d3c8",
      accentStrong: "#f1ede4",
      accentDeep: "#a9a396",
      accentLift: "#f1ede4",
      accentTint: "#2f3138",
      onAccent: "#17181c",
      text: "#f4f3f0",
      textSoft: "#ded9d1",
      muted: "#9a9791",
      ok: "#96dcae",
      warn: "#dfa06c",
      danger: "#ef9d9d",
      glow2: "#4a4a52",
    }),
    light: palette({
      bg1: "#f8f7f5",
      bg2: "#efedea",
      bg3: "#e4e1dc",
      surface1: "#ffffff",
      surface2: "#fbfaf8",
      surface3: "#f2f0ec",
      accent: "#4a4a52",
      accentStrong: "#5f6069",
      accentDeep: "#33333a",
      accentLift: "#7a7b85",
      accentTint: "#eceae6",
      onAccent: "#fbfaf8",
      text: "#1e1f23",
      textSoft: "#35363c",
      muted: "#62636a",
      ok: "#2f7a4f",
      warn: "#b86a3c",
      danger: "#a8443a",
    }),
  },
  {
    id: "ember",
    label: "Ember & Rose",
    blurb: "Smoked maroon lit with rose gold — dramatic evening salon.",
    dark: palette({
      bg1: "#2a161a",
      bg2: "#1c0f12",
      bg3: "#13090c",
      surface1: "#2f1a1e",
      surface2: "#3b2126",
      surface3: "#170c0f",
      accent: "#e8a08c",
      accentStrong: "#f6c3b2",
      accentDeep: "#b9705e",
      accentLift: "#f6c3b2",
      accentTint: "#3b2126",
      onAccent: "#1c0f12",
      text: "#fdf3f0",
      textSoft: "#f0d9d2",
      muted: "#b5948e",
      ok: "#9fe3b8",
      warn: "#e8b06c",
      danger: "#f79a9a",
      glow2: "#8a3f34",
    }),
    light: palette({
      bg1: "#fdf5f2",
      bg2: "#f8eae5",
      bg3: "#f0dcd5",
      surface1: "#ffffff",
      surface2: "#fffaf8",
      surface3: "#fbeee9",
      accent: "#a34a3c",
      accentStrong: "#b85c4c",
      accentDeep: "#85372c",
      accentLift: "#cd7565",
      accentTint: "#fae4dd",
      onAccent: "#fffaf8",
      text: "#2c1a17",
      textSoft: "#422722",
      muted: "#6b4a44",
      ok: "#2f7a4f",
      warn: "#b86a3c",
      danger: "#a8443a",
    }),
  },
  {
    id: "laurel",
    label: "Laurel & Brass",
    blurb: "Deep laurel green with brushed brass — botanical and grounded.",
    dark: palette({
      bg1: "#16241c",
      bg2: "#0f1a14",
      bg3: "#0a120e",
      surface1: "#17281f",
      surface2: "#1f3527",
      surface3: "#0c1611",
      accent: "#cbb072",
      accentStrong: "#e5d19c",
      accentDeep: "#9d8550",
      accentLift: "#e5d19c",
      accentTint: "#1f3527",
      onAccent: "#0f1a14",
      text: "#f2f7f2",
      textSoft: "#d8e6da",
      muted: "#8fa595",
      ok: "#9fe3b8",
      warn: "#e0b06c",
      danger: "#f2a09a",
      glow2: "#2d5238",
    }),
    light: palette({
      bg1: "#f6faf5",
      bg2: "#e9f1e8",
      bg3: "#dce8da",
      surface1: "#ffffff",
      surface2: "#fbfdfa",
      surface3: "#eef5ec",
      accent: "#3d6b4a",
      accentStrong: "#4c8059",
      accentDeep: "#2d5238",
      accentLift: "#649a72",
      accentTint: "#e2efe1",
      onAccent: "#fbfdfa",
      text: "#17241a",
      textSoft: "#263524",
      muted: "#55685a",
      ok: "#2f7a4f",
      warn: "#b8863c",
      danger: "#a8443a",
    }),
  },
  {
    id: "indigo",
    label: "Indigo & Ice",
    blurb: "Midnight indigo with ice blue — crisp, modern, urban.",
    dark: palette({
      bg1: "#17203a",
      bg2: "#101728",
      bg3: "#0a0f1c",
      surface1: "#1a2340",
      surface2: "#232e4e",
      surface3: "#0d1322",
      accent: "#8fb6ee",
      accentStrong: "#c2d8f8",
      accentDeep: "#5f86bd",
      accentLift: "#c2d8f8",
      accentTint: "#232e4e",
      onAccent: "#101728",
      text: "#f1f5fd",
      textSoft: "#d6e2f4",
      muted: "#94a3bf",
      ok: "#9fe3b8",
      warn: "#e5b070",
      danger: "#f5a1a1",
      glow2: "#26406f",
    }),
    light: palette({
      bg1: "#f7f9fd",
      bg2: "#e9eff9",
      bg3: "#dbe4f3",
      surface1: "#ffffff",
      surface2: "#fbfcff",
      surface3: "#eef3fb",
      accent: "#35538c",
      accentStrong: "#44669f",
      accentDeep: "#26406f",
      accentLift: "#5b7fb8",
      accentTint: "#e3ebf8",
      onAccent: "#fbfcff",
      text: "#161d2e",
      textSoft: "#26304a",
      muted: "#55617d",
      ok: "#2f7a4f",
      warn: "#b8783c",
      danger: "#a8443a",
    }),
  },
  {
    id: "blush",
    label: "Blush & Mauve",
    blurb: "Dusty rose over mauve shadow — soft, feminine, not sugary.",
    dark: palette({
      bg1: "#2a1d26",
      bg2: "#1d1319",
      bg3: "#140d11",
      surface1: "#2e2029",
      surface2: "#3a2833",
      surface3: "#180f14",
      accent: "#e2a8bf",
      accentStrong: "#f4cdda",
      accentDeep: "#b1798e",
      accentLift: "#f4cdda",
      accentTint: "#3a2833",
      onAccent: "#1d1319",
      text: "#fcf2f6",
      textSoft: "#eed7e1",
      muted: "#b096a1",
      ok: "#9fe3b8",
      warn: "#e5b070",
      danger: "#f5a1a1",
      glow2: "#773451",
    }),
    light: palette({
      bg1: "#fdf7fa",
      bg2: "#f8eaf0",
      bg3: "#f0dbe4",
      surface1: "#ffffff",
      surface2: "#fffbfc",
      surface3: "#fbedf3",
      accent: "#96486a",
      accentStrong: "#ab5a7d",
      accentDeep: "#773451",
      accentLift: "#c07694",
      accentTint: "#f8e3ec",
      onAccent: "#fffbfc",
      text: "#2a1922",
      textSoft: "#402634",
      muted: "#6d4f5c",
      ok: "#2f7a4f",
      warn: "#b8783c",
      danger: "#a8443a",
    }),
  },
  {
    id: "saffron",
    label: "Saffron & Clay",
    blurb: "Terracotta clay warmed by saffron — sunlit and hospitable.",
    dark: palette({
      bg1: "#2a1f16",
      bg2: "#1c150f",
      bg3: "#130e09",
      surface1: "#2f231a",
      surface2: "#3c2d20",
      surface3: "#171109",
      accent: "#e8a955",
      accentStrong: "#f6cd8e",
      accentDeep: "#b57e37",
      accentLift: "#f6cd8e",
      accentTint: "#3c2d20",
      onAccent: "#1c150f",
      text: "#fdf5ea",
      textSoft: "#f0dcc2",
      muted: "#b39c81",
      ok: "#9fe3b8",
      warn: "#e8b06c",
      danger: "#f5a1a1",
      glow2: "#85491a",
    }),
    light: palette({
      bg1: "#fdf8f0",
      bg2: "#f8ecdc",
      bg3: "#f0decb",
      surface1: "#ffffff",
      surface2: "#fffcf7",
      surface3: "#fbf0e2",
      accent: "#a35f28",
      accentStrong: "#b87336",
      accentDeep: "#85491a",
      accentLift: "#cd8b4c",
      accentTint: "#f8e7d3",
      onAccent: "#fffcf7",
      text: "#2c1f13",
      textSoft: "#422f1d",
      muted: "#6b5540",
      ok: "#2f7a4f",
      warn: "#b8783c",
      danger: "#a8443a",
    }),
  },
];

export const SALON_THEME_IDS = SALON_THEMES.map((t) => t.id);

/** Keeps FHSalon looking exactly as it does today; new salons inherit these too. */
export const DEFAULT_BOOKING_THEME_ID = "plum";
export const DEFAULT_MANAGER_THEME_ID = "cocoa";
export const DEFAULT_STYLIST_THEME_ID = "seaglass";

export function getSalonTheme(id: string | null | undefined, fallback: string) {
  return (
    SALON_THEMES.find((t) => t.id === id) ??
    SALON_THEMES.find((t) => t.id === fallback) ??
    SALON_THEMES[0]
  );
}

export function normalizeThemeId(raw: unknown, fallback: string) {
  const value = String(raw ?? "").trim().toLowerCase();
  return SALON_THEME_IDS.includes(value) ? value : fallback;
}

/* -------------------------------------------------------------------------- */
/* Runtime helpers                                                            */
/* -------------------------------------------------------------------------- */

/** Write one pack's tokens onto an element (usually `<html>`). */
function paintPalette(el: HTMLElement, p: ThemePalette) {
  const set = (name: string, value: string) => el.style.setProperty(`--t-${name}`, value);
  const setPair = (name: string, hex: string) => {
    set(name, hex);
    set(`${name}-rgb`, rgbTriplet(hex));
  };
  setPair("bg-1", p.bg1);
  setPair("bg-2", p.bg2);
  setPair("bg-3", p.bg3);
  set("glow-1-rgb", rgbTriplet(p.glow1));
  set("glow-2-rgb", rgbTriplet(p.glow2));
  set("glow-1-a", isDarkColor(p.bg2) ? "0.2" : "0.12");
  set("glow-2-a", isDarkColor(p.bg2) ? "0.32" : "0.08");
  setPair("surface-1", p.surface1);
  setPair("surface-2", p.surface2);
  setPair("surface-3", p.surface3);
  set("tint-1", p.tint1);
  set("tint-2", p.tint2);
  set("tint-3", p.tint3);
  setPair("accent", p.accent);
  setPair("accent-strong", p.accentStrong);
  setPair("accent-deep", p.accentDeep);
  set("accent-lift", p.accentLift);
  set("accent-tint", p.accentTint);
  set("on-accent", p.onAccent);
  setPair("text", p.text);
  set("text-soft", p.textSoft);
  setPair("muted", p.muted);
  set("ok", p.ok);
  set("warn", p.warn);
  set("danger", p.danger);
  set("shadow-rgb", rgbTriplet(p.shadow));
}

function paintDock(el: HTMLElement, dark: ThemePalette) {
  const set = (name: string, value: string) => el.style.setProperty(`--t-${name}`, value);
  set("dock-bg", dark.bg3);
  set("dock-bg-rgb", rgbTriplet(dark.bg3));
  set("dock-fg-rgb", rgbTriplet(dark.text));
  set("dock-accent", dark.accent);
  set("dock-accent-rgb", rgbTriplet(dark.accent));
  set("dock-accent-deep-rgb", rgbTriplet(dark.accentDeep));
}

/** CSS text for a palette — used in the live `<style>` injector. */
function paletteCssText(p: ThemePalette, darkDock: ThemePalette) {
  const line = (name: string, value: string) => `  --t-${name}: ${value} !important;`;
  const pair = (name: string, hex: string) => [line(name, hex), line(`${name}-rgb`, rgbTriplet(hex))];
  return [
    line("dock-bg", darkDock.bg3),
    line("dock-bg-rgb", rgbTriplet(darkDock.bg3)),
    line("dock-fg-rgb", rgbTriplet(darkDock.text)),
    line("dock-accent", darkDock.accent),
    line("dock-accent-rgb", rgbTriplet(darkDock.accent)),
    line("dock-accent-deep-rgb", rgbTriplet(darkDock.accentDeep)),
    ...pair("bg-1", p.bg1),
    ...pair("bg-2", p.bg2),
    ...pair("bg-3", p.bg3),
    line("glow-1-rgb", rgbTriplet(p.glow1)),
    line("glow-2-rgb", rgbTriplet(p.glow2)),
    line("glow-1-a", isDarkColor(p.bg2) ? "0.2" : "0.12"),
    line("glow-2-a", isDarkColor(p.bg2) ? "0.32" : "0.08"),
    ...pair("surface-1", p.surface1),
    ...pair("surface-2", p.surface2),
    ...pair("surface-3", p.surface3),
    line("tint-1", p.tint1),
    line("tint-2", p.tint2),
    line("tint-3", p.tint3),
    ...pair("accent", p.accent),
    ...pair("accent-strong", p.accentStrong),
    ...pair("accent-deep", p.accentDeep),
    line("accent-lift", p.accentLift),
    line("accent-tint", p.accentTint),
    line("on-accent", p.onAccent),
    ...pair("text", p.text),
    line("text-soft", p.textSoft),
    ...pair("muted", p.muted),
    line("ok", p.ok),
    line("warn", p.warn),
    line("danger", p.danger),
    line("shadow-rgb", rgbTriplet(p.shadow)),
  ].join("\n");
}

const LIVE_THEME_STYLE_ID = "salon-theme-live-vars";

/**
 * Injects pack tokens as a high-priority stylesheet. Beats Tailwind layer
 * ordering, stale SW caches, and attribute-selector misses.
 */
function injectLiveThemeStyle(theme: SalonTheme, light: boolean) {
  if (typeof document === "undefined") return;
  let el = document.getElementById(LIVE_THEME_STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = LIVE_THEME_STYLE_ID;
    document.head.appendChild(el);
  }
  const p = light ? theme.light : theme.dark;
  el.textContent = `html, html[data-salon-theme="${theme.id}"] {\n${paletteCssText(p, theme.dark)}\n}`;
}

/**
 * Swaps the active pack on `<html>` and paints `--t-*` via a live stylesheet
 * (+ inline props as a belt-and-suspenders fallback).
 */
export function applySalonThemeId(id: string | null | undefined, fallback: string) {
  if (typeof document === "undefined") return;
  const theme = getSalonTheme(id, fallback);
  const root = document.documentElement;
  root.setAttribute("data-salon-theme", theme.id);
  const light = root.classList.contains("theme-light");
  injectLiveThemeStyle(theme, light);
  paintDock(root, theme.dark);
  paintPalette(root, light ? theme.light : theme.dark);

  // Keep remapped shell aliases in sync on .book-theme / .admin-theme / .stylist-theme.
  document.querySelectorAll(".book-theme, .admin-theme, .stylist-theme").forEach((node) => {
    const el = node as HTMLElement;
    el.style.setProperty("--champagne", "var(--t-accent)");
    el.style.setProperty("--cocoa", "var(--t-accent-strong)");
    el.style.setProperty("--color-champagne", "var(--t-accent)");
    el.style.setProperty("--color-cocoa", "var(--t-accent-strong)");
    el.style.setProperty("--color-cream", "var(--t-bg-1)");
    el.style.setProperty("--ink", "var(--t-text)");
    el.style.setProperty("--muted", "var(--t-muted)");
  });
}

/** Re-paint the current pack after light/dark toggle flips `.theme-light`. */
export function refreshSalonThemePaint(fallback: string) {
  if (typeof document === "undefined") return;
  const id = document.documentElement.getAttribute("data-salon-theme");
  applySalonThemeId(id, fallback);
}

/** Resolved value of a `--t-*` token on the current document, or "" server-side. */
export function readThemeToken(name: string) {
  if (typeof document === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** Keeps the PWA status bar in step with the active pack. */
export function setThemeColorMeta(token: string, fallback: string) {
  if (typeof document === "undefined") return;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", readThemeToken(token) || fallback);
}

/* -------------------------------------------------------------------------- */
/* CSS emission                                                               */
/* -------------------------------------------------------------------------- */

function paletteVars(p: ThemePalette, indent = "  ") {
  const line = (name: string, value: string) => `${indent}--t-${name}: ${value};`;
  const pair = (name: string, hex: string) => [line(name, hex), line(`${name}-rgb`, rgbTriplet(hex))];
  return [
    ...pair("bg-1", p.bg1),
    ...pair("bg-2", p.bg2),
    ...pair("bg-3", p.bg3),
    line("glow-1-rgb", rgbTriplet(p.glow1)),
    line("glow-2-rgb", rgbTriplet(p.glow2)),
    line("glow-1-a", isDarkColor(p.bg2) ? "0.2" : "0.12"),
    line("glow-2-a", isDarkColor(p.bg2) ? "0.32" : "0.08"),
    ...pair("surface-1", p.surface1),
    ...pair("surface-2", p.surface2),
    ...pair("surface-3", p.surface3),
    line("tint-1", p.tint1),
    line("tint-2", p.tint2),
    line("tint-3", p.tint3),
    ...pair("accent", p.accent),
    ...pair("accent-strong", p.accentStrong),
    ...pair("accent-deep", p.accentDeep),
    line("accent-lift", p.accentLift),
    line("accent-tint", p.accentTint),
    line("on-accent", p.onAccent),
    ...pair("text", p.text),
    line("text-soft", p.textSoft),
    ...pair("muted", p.muted),
    line("ok", p.ok),
    line("warn", p.warn),
    line("danger", p.danger),
    line("shadow-rgb", rgbTriplet(p.shadow)),
    `${indent}color-scheme: ${isDarkColor(p.bg2) ? "dark" : "light"};`,
  ].join("\n");
}

/**
 * The phone dock and boot splash stay dark in both modes, so they read from the
 * pack's dark palette regardless of the light/dark toggle.
 */
function dockVars(theme: SalonTheme, indent = "  ") {
  const d = theme.dark;
  return [
    `${indent}--t-dock-bg: ${d.bg3};`,
    `${indent}--t-dock-bg-rgb: ${rgbTriplet(d.bg3)};`,
    `${indent}--t-dock-fg-rgb: ${rgbTriplet(d.text)};`,
    `${indent}--t-dock-accent: ${d.accent};`,
    `${indent}--t-dock-accent-rgb: ${rgbTriplet(d.accent)};`,
    `${indent}--t-dock-accent-deep-rgb: ${rgbTriplet(d.accentDeep)};`,
  ].join("\n");
}

/** CSS for one pack: dark by default, light when the shell adds `.theme-light`. */
export function salonThemeCss(theme: SalonTheme) {
  const sel = `html[data-salon-theme="${theme.id}"]`;
  return [
    `${sel} {`,
    dockVars(theme),
    paletteVars(theme.dark),
    `}`,
    ``,
    `${sel}.theme-light {`,
    paletteVars(theme.light),
    `}`,
  ].join("\n");
}

export function allSalonThemesCss() {
  const fallback = getSalonTheme(DEFAULT_MANAGER_THEME_ID, DEFAULT_MANAGER_THEME_ID);
  return [
    `/* Generated by scripts/build-salon-themes.ts — edit src/lib/salon-themes.ts instead. */`,
    ``,
    `/* Safety net for pages outside a salon app (marketing, /platform). */`,
    `:root {`,
    dockVars(fallback),
    paletteVars(fallback.light),
    `}`,
    ``,
    ...SALON_THEMES.map(salonThemeCss),
    ``,
  ].join("\n");
}
