/**
 * TraceBook design tokens.
 *
 * A warm "paper + ink" palette so light mode reads like a well-printed book and
 * dark mode like a lamp-lit study. Both modes expose the same token names, so
 * screens never branch on theme — they just read tokens.
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
  };
  radius: { xs: number; sm: number; md: number; lg: number; xl: number; pill: number };
  space: (n: number) => number;
  type: {
    display: { fontSize: number; lineHeight: number; fontWeight: "800"; letterSpacing: number };
    title: { fontSize: number; lineHeight: number; fontWeight: "800"; letterSpacing: number };
    heading: { fontSize: number; lineHeight: number; fontWeight: "700" };
    body: { fontSize: number; lineHeight: number };
    label: { fontSize: number; lineHeight: number; fontWeight: "600" };
    caption: { fontSize: number; lineHeight: number };
  };
  motion: {
    fast: number;
    base: number;
    slow: number;
    /** Cubic-bezier control points usable by both RN Animated and CSS. */
    easeOut: [number, number, number, number];
    easeInOut: [number, number, number, number];
    spring: { tension: number; friction: number };
  };
  shadow: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
  /** Heavier elevation for popovers and sheets. */
  shadowLg: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
}

const base = {
  radius: { xs: 6, sm: 10, md: 16, lg: 22, xl: 28, pill: 999 },
  space: (n: number) => n * 4,
  type: {
    display: { fontSize: 34, lineHeight: 40, fontWeight: "800" as const, letterSpacing: -1 },
    title: { fontSize: 26, lineHeight: 32, fontWeight: "800" as const, letterSpacing: -0.6 },
    heading: { fontSize: 17, lineHeight: 22, fontWeight: "700" as const },
    body: { fontSize: 14.5, lineHeight: 21 },
    label: { fontSize: 13, lineHeight: 18, fontWeight: "600" as const },
    caption: { fontSize: 11.5, lineHeight: 15 },
  },
  motion: {
    fast: 140,
    base: 240,
    slow: 420,
    easeOut: [0.16, 1, 0.3, 1] as [number, number, number, number],
    easeInOut: [0.65, 0, 0.35, 1] as [number, number, number, number],
    spring: { tension: 180, friction: 22 },
  },
};

export const lightTheme: Theme = {
  mode: "light",
  colors: {
    bg: "#F7F4EE",
    bgElevated: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceAlt: "#F0EBE1",
    surfaceHover: "#EAE3D6",
    border: "#E4DCCC",
    borderStrong: "#CFC4AE",
    text: "#241F1A",
    textMuted: "#6B6155",
    textFaint: "#A79B8A",
    primary: "#3F6B57",
    primarySoft: "#DCEAE1",
    onPrimary: "#FFFFFF",
    accent: "#C4622D",
    accentSoft: "#F6E2D5",
    success: "#3F6B57",
    successSoft: "#DCEAE1",
    warning: "#C99A2E",
    warningSoft: "#F6EDD6",
    danger: "#B4443B",
    dangerSoft: "#F6DEDB",
    streak: "#C4622D",
    gridLine: "rgba(63,107,87,0.08)",
    overlay: "rgba(36,31,26,0.42)",
    ring: "rgba(63,107,87,0.30)",
  },
  ...base,
  shadow: {
    shadowColor: "#241F1A",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  shadowLg: {
    shadowColor: "#241F1A",
    shadowOpacity: 0.16,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
};

export const darkTheme: Theme = {
  mode: "dark",
  colors: {
    bg: "#14110E",
    bgElevated: "#1D1915",
    surface: "#1D1915",
    surfaceAlt: "#26201A",
    surfaceHover: "#2E261E",
    border: "#332B23",
    borderStrong: "#4A3F33",
    text: "#F4EFE7",
    textMuted: "#B3A896",
    textFaint: "#6E6355",
    primary: "#7FBFA0",
    primarySoft: "#233830",
    onPrimary: "#0F1A15",
    accent: "#E8A87C",
    accentSoft: "#3A2A20",
    success: "#7FBFA0",
    successSoft: "#233830",
    warning: "#E5C066",
    warningSoft: "#3A3220",
    danger: "#E08B80",
    dangerSoft: "#3A2320",
    streak: "#E8A87C",
    gridLine: "rgba(127,191,160,0.07)",
    overlay: "rgba(0,0,0,0.55)",
    ring: "rgba(127,191,160,0.32)",
  },
  ...base,
  shadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  shadowLg: {
    shadowColor: "#000000",
    shadowOpacity: 0.55,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 18 },
    elevation: 14,
  },
};

export const themes: Record<ThemeMode, Theme> = { light: lightTheme, dark: darkTheme };
