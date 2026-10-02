/**
 * TraceBook design tokens.
 *
 * A high-energy Gen-Z palette: a high-contrast canvas with saturated electric
 * accents (violet, lime, hot pink, cyan), chunky rounded cards with visible
 * borders and hard offset "sticker" shadows. Both modes expose the same token
 * names, so screens never branch on theme - they just read tokens.
 *
 * Light reads "morning light on a pixel sketchbook"; dark reads "neon ink on a
 * chalkboard". The premium/pro pair is deliberately distinct from
 * primary/accent so the paywall can glow without colliding with action colour.
 */

export type ThemeMode = "light" | "dark";

export interface Theme {
  mode: ThemeMode;
  colors: {
    bg: string;
    bgElevated: string;
    surface: string;
    surfaceAlt: string;
    surfaceHover: string;
    border: string;
    borderStrong: string;
    text: string;
    textMuted: string;
    textFaint: string;
    primary: string;
    primarySoft: string;
    onPrimary: string;
    accent: string;
    accentSoft: string;
    success: string;
    successSoft: string;
    warning: string;
    warningSoft: string;
    danger: string;
    dangerSoft: string;
    streak: string;
    gridLine: string;
    overlay: string;
    ring: string;
    /** Electric violet - brand ramp. */
    violet: string;
    violetSoft: string;
    /** Hot pink - secondary pop. */
    pink: string;
    pinkSoft: string;
    /** Acid lime - success/luminosity. */
    lime: string;
    limeSoft: string;
    /** Electric cyan - info/tech. */
    cyan: string;
    cyanSoft: string;
    /** Solar amber - warning/streak. */
    amber: string;
    amberSoft: string;
    /** Premium gold - the paid tier accent. */
    premium: string;
    premiumSoft: string;
  };
  radius: { xs: number; sm: number; md: number; lg: number; xl: number; pill: number };
  space: (n: number) => number;
  type: {
    display: { fontSize: number; lineHeight: number; fontWeight: "900"; letterSpacing: number };
    title: { fontSize: number; lineHeight: number; fontWeight: "900"; letterSpacing: number };
    heading: { fontSize: number; lineHeight: number; fontWeight: "800" };
    body: { fontSize: number; lineHeight: number };
    label: { fontSize: number; lineHeight: number; fontWeight: "700" };
    caption: { fontSize: number; lineHeight: number };
  };
  motion: {
    fast: number;
    base: number;
    slow: number;
    easeOut: [number, number, number, number];
    easeInOut: [number, number, number, number];
    spring: { tension: number; friction: number };
  };
  elevation: {
    none: ShadowDef;
    sm: ShadowDef;
    md: ShadowDef;
    lg: ShadowDef;
  };
  shadowLg: ShadowDef;
  shadow: ShadowDef;
  gradient: {
    hero: readonly [string, string];
    surface: readonly [string, string];
    accent: readonly [string, string];
  };
  container: { content: number; wide: number };
  breakpoints: { sm: number; md: number; lg: number };
  zIndex: { base: number; chrome: number; overlay: number; sheet: number };
}

export type ShadowDef = {
  shadowColor: string;
  shadowOpacity: number;
  shadowRadius: number;
  shadowOffset: { width: number; height: number };
  elevation: number;
};

const STICKER_LIGHT = "#241F1A";
const STICKER_DARK = "#000000";

function stickerShadow(color: string, opacity: number, radius: number, dy: number): ShadowDef {
  return {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowRadius: radius,
    shadowOffset: { width: 0, height: dy },
    elevation: Math.round(dy * 0.6),
  };
}

const base = {
  radius: { xs: 10, sm: 14, md: 20, lg: 26, xl: 34, pill: 999 },
  space: (n: number) => n * 4,
  type: {
    display: { fontSize: 42, lineHeight: 46, fontWeight: "900" as const, letterSpacing: -1.4 },
    title: { fontSize: 30, lineHeight: 36, fontWeight: "900" as const, letterSpacing: -0.9 },
    heading: { fontSize: 19, lineHeight: 26, fontWeight: "800" as const, letterSpacing: -0.2 },
    body: { fontSize: 15, lineHeight: 23 },
    label: { fontSize: 13.5, lineHeight: 18, fontWeight: "700" as const },
    caption: { fontSize: 12, lineHeight: 16 },
  },
  motion: {
    fast: 120,
    base: 220,
    slow: 420,
    easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
    easeInOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
    spring: { tension: 220, friction: 18 },
  },
  container: { content: 720, wide: 1100 },
  breakpoints: { sm: 480, md: 768, lg: 1024 },
  zIndex: { base: 0, chrome: 40, overlay: 60, sheet: 80 },
};

export const lightTheme: Theme = {
  mode: "light",
  colors: {
    bg: "#F6F2FF",
    bgElevated: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceAlt: "#F0EBFA",
    surfaceHover: "#E6DFF6",
    border: "#E6DFF2",
    borderStrong: "#C9BDE0",
    text: "#171122",
    textMuted: "#5D5470",
    textFaint: "#9B90AE",
    primary: "#5B21E6",
    primarySoft: "#EDE4FF",
    onPrimary: "#FFFFFF",
    accent: "#E11D9A",
    accentSoft: "#FFE3F3",
    success: "#1FA261",
    successSoft: "#DCF5E6",
    warning: "#C77C02",
    warningSoft: "#FFF0D3",
    danger: "#E0263E",
    dangerSoft: "#FFE1E5",
    streak: "#FF7A00",
    gridLine: "rgba(91,33,230,0.07)",
    overlay: "rgba(23,17,34,0.44)",
    ring: "rgba(91,33,230,0.35)",
    violet: "#5B21E6",
    violetSoft: "#EDE4FF",
    pink: "#E11D9A",
    pinkSoft: "#FFE3F3",
    lime: "#2ECF5F",
    limeSoft: "#DFF9E8",
    cyan: "#0EA5E6",
    cyanSoft: "#DFF4FE",
    amber: "#F59E0B",
    amberSoft: "#FFF4D6",
    premium: "#B8860B",
    premiumSoft: "#FBF0D9",
  },
  ...base,
  gradient: {
    hero: ["#7C3AED", "#E11D9A"] as const,
    surface: ["#FFFFFF", "#F0EBFF"] as const,
    accent: ["#0EA5E6", "#2ECF5F"] as const,
  },
  elevation: {
    none: stickerShadow(STICKER_LIGHT, 0, 0, 0),
    sm: stickerShadow(STICKER_LIGHT, 0.08, 6, 2),
    md: stickerShadow(STICKER_LIGHT, 0.14, 10, 4),
    lg: stickerShadow(STICKER_LIGHT, 0.2, 16, 7),
  },
  shadowLg: stickerShadow(STICKER_LIGHT, 0.22, 20, 10),
  shadow: stickerShadow(STICKER_LIGHT, 0.12, 12, 5),
};

export const darkTheme: Theme = {
  mode: "dark",
  colors: {
    bg: "#0C0913",
    bgElevated: "#17121F",
    surface: "#17121F",
    surfaceAlt: "#221B2E",
    surfaceHover: "#2C2339",
    border: "#2E263B",
    borderStrong: "#463A58",
    text: "#F6F1FF",
    textMuted: "#B9AECB",
    textFaint: "#6F6482",
    primary: "#B18CFF",
    primarySoft: "#2E2148",
    onPrimary: "#120829",
    accent: "#FF6FD8",
    accentSoft: "#3E1A35",
    success: "#56E39B",
    successSoft: "#123324",
    warning: "#FFD166",
    warningSoft: "#3A2F0F",
    danger: "#FF7A8A",
    dangerSoft: "#401A20",
    streak: "#FF8A3D",
    gridLine: "rgba(177,140,255,0.07)",
    overlay: "rgba(0,0,0,0.6)",
    ring: "rgba(177,140,255,0.35)",
    violet: "#B18CFF",
    violetSoft: "#2E2148",
    pink: "#FF6FD8",
    pinkSoft: "#3E1A35",
    lime: "#56E39B",
    limeSoft: "#123324",
    cyan: "#4CC9FF",
    cyanSoft: "#0E2B41",
    amber: "#FFD166",
    amberSoft: "#3A2F0F",
    premium: "#FFD166",
    premiumSoft: "#3A2F0F",
  },
  ...base,
  gradient: {
    hero: ["#7C3AED", "#E11D9A"] as const,
    surface: ["#17121F", "#241A3A"] as const,
    accent: ["#4CC9FF", "#56E39B"] as const,
  },
  elevation: {
    none: stickerShadow(STICKER_DARK, 0, 0, 0),
    sm: stickerShadow(STICKER_DARK, 0.35, 4, 2),
    md: stickerShadow(STICKER_DARK, 0.45, 8, 4),
    lg: stickerShadow(STICKER_DARK, 0.55, 14, 7),
  },
  shadowLg: stickerShadow(STICKER_DARK, 0.6, 18, 10),
  shadow: stickerShadow(STICKER_DARK, 0.5, 12, 5),
};

export const themes: Record<ThemeMode, Theme> = { light: lightTheme, dark: darkTheme };
