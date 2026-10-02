/**
 * Bridges TraceBook's design tokens onto Nivo's theme shape.
 *
 * Nivo renders into the DOM, so this module is only ever imported from the
 * `.web` chart implementations. Everything here is derived from `useTheme()`,
 * which keeps the charts in step with light/dark mode without duplicating
 * colour values.
 */
import type { PartialTheme } from "@nivo/theming";
import type { Theme } from "../../theme/theme";

/** Five-step ramp for the contribution calendar, low → high activity. */
const STREAK_RAMP: Record<Theme["mode"], string[]> = {
  light: ["#E4EFE8", "#BBD8C6", "#88BCA0", "#559B79", "#2F6B50"],
  dark: ["#1E2E26", "#2C4A3A", "#3D6E55", "#55A07B", "#8FD3AE"],
};

export function streakColors(theme: Theme): string[] {
  return STREAK_RAMP[theme.mode];
}

/**
 * Genre palette. Starts from the brand hues so the donut still reads as
 * TraceBook, then extends with harmonious neighbours to separate eight
 * categories without relying on colour alone (labels carry the rest).
 */
const GENRE_PALETTE: Record<Theme["mode"], string[]> = {
  light: ["#3F6B57", "#C4622D", "#C99A2E", "#7A5AA8", "#2F7E8C", "#8C4A5A", "#5E7A3A", "#A0522D"],
  dark: ["#7FBFA0", "#E8A87C", "#E5C066", "#A98FD8", "#63B4C4", "#D98BA0", "#9DBB6A", "#D9915F"],
};

export function genreColors(theme: Theme): string[] {
  return GENRE_PALETTE[theme.mode];
}

/** Bar/line palette for the monthly chart. */
export function monthlyColors(theme: Theme): { pages: string; books: string } {
  return theme.mode === "dark"
    ? { pages: "#7FBFA0", books: "#E8A87C" }
    : { pages: "#3F6B57", books: "#C4622D" };
}

const FONT_SANS = "IBMPlexSans_400Regular";
const FONT_ARABIC = "IBMPlexSansArabic_400Regular";

/**
 * @param theme   Active TraceBook theme.
 * @param arabic  Switches the family so Arabic copy renders with its own font.
 */
export function buildNivoTheme(theme: Theme, arabic: boolean): PartialTheme {
  const c = theme.colors;
  const family = arabic ? FONT_ARABIC : FONT_SANS;
  const text = { fontFamily: family, fontSize: 12, fill: c.textMuted };

  return {
    background: "transparent",
    text,
    axis: {
      domain: { line: { stroke: c.border, strokeWidth: 1 } },
      ticks: {
        line: { stroke: c.border, strokeWidth: 1 },
        text: { ...text, fontSize: 11, fill: c.textFaint },
      },
      legend: { text: { ...text, fill: c.text } },
    },
    grid: { line: { stroke: c.gridLine, strokeWidth: 1 } },
    crosshair: { line: { stroke: c.primary, strokeWidth: 1, strokeOpacity: 0.5, strokeDasharray: "4 4" } },
    legends: {
      text: { ...text, fill: c.textMuted },
      title: { text: { ...text, fill: c.text } },
      ticks: { line: { stroke: c.border }, text: { ...text, fontSize: 11 } },
      hidden: { symbol: { fill: c.textFaint, opacity: 0.5 }, text: { ...text, fill: c.textFaint } },
    },
    labels: { text: { ...text, fontSize: 12, fill: c.text, fontWeight: 600 } },
    markers: { lineColor: c.borderStrong, lineStrokeWidth: 1, text: { ...text, fill: c.textMuted } },
    dots: { text: { ...text, fill: c.text } },
    tooltip: {
      container: {
        background: c.bgElevated,
        color: c.text,
        fontSize: 12,
        fontFamily: family,
        borderRadius: 12,
        border: `1px solid ${c.border}`,
        boxShadow: theme.mode === "dark" ? "0 10px 30px rgba(0,0,0,0.5)" : "0 10px 30px rgba(36,31,26,0.14)",
        padding: "8px 12px",
      },
    },
  } as PartialTheme;
}
