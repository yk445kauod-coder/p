/**
 * TraceBook design tokens.
 * A warm "paper + ink" palette so light mode reads like a well-printed book and
 * dark mode like a lamp-lit study. Both share the same token names.
 */

export type ThemeMode = "light" | "dark";

export interface Theme {
  mode: ThemeMode;
  colors: {
    bg: string;
    bgElevated: string;
    surface: string;
    surfaceAlt: string;
    border: string;
    text: string;
    textMuted: string;
    textFaint: string;
    primary: string;
    primarySoft: string;
    accent: string;
    accentSoft: string;
    success: string;
    warning: string;
    danger: string;
    streak: string;
    gridLine: string;
  };
  radius: { sm: number; md: number; lg: number; pill: number };
  space: (n: number) => number;
  shadow: {
    shadowColor: string;
    shadowOpacity: number;
    shadowRadius: number;
    shadowOffset: { width: number; height: number };
    elevation: number;
  };
}

const base = {
  radius: { sm: 10, md: 16, lg: 24, pill: 999 },
  space: (n: number) => n * 4,
};

export const lightTheme: Theme = {
  mode: "light",
  colors: {
    bg: "#F7F4EE",
    bgElevated: "#FFFFFF",
    surface: "#FFFFFF",
    surfaceAlt: "#F0EBE1",
    border: "#E4DCCC",
    text: "#241F1A",
    textMuted: "#6B6155",
    textFaint: "#A79B8A",
    primary: "#3F6B57",
    primarySoft: "#DCEAE1",
    accent: "#C4622D",
    accentSoft: "#F6E2D5",
    success: "#3F6B57",
    warning: "#C99A2E",
    danger: "#B4443B",
    streak: "#C4622D",
    gridLine: "rgba(63,107,87,0.08)",
  },
  ...base,
  shadow: {
    shadowColor: "#241F1A",
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
};

export const darkTheme: Theme = {
  mode: "dark",
  colors: {
    bg: "#14110E",
    bgElevated: "#1D1915",
    surface: "#1D1915",
    surfaceAlt: "#26201A",
    border: "#332B23",
    text: "#F4EFE7",
    textMuted: "#B3A896",
    textFaint: "#6E6355",
    primary: "#7FBFA0",
    primarySoft: "#233830",
    accent: "#E8A87C",
    accentSoft: "#3A2A20",
    success: "#7FBFA0",
    warning: "#E5C066",
    danger: "#E08B80",
    streak: "#E8A87C",
    gridLine: "rgba(127,191,160,0.07)",
  },
  ...base,
  shadow: {
    shadowColor: "#000000",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
};

export const themes: Record<ThemeMode, Theme> = { light: lightTheme, dark: darkTheme };
