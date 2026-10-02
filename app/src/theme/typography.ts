/**
 * Typography.
 *
 * Two families carry the whole app: IBM Plex Sans for Latin, IBM Plex Sans
 * Arabic for Arabic. Both are the same superfamily, so mixed en/ar copy sits on
 * the same rhythm and weight scale.
 *
 * React Native does not synthesise weights for custom fonts — a `fontWeight`
 * alone does nothing once a family is set. Every weight therefore has to be its
 * own registered family name, which is what `fontFor()` hands back.
 */

export const FONT_FAMILY = {
  sans: "IBMPlexSans_400Regular",
  arabic: "IBMPlexSansArabic_400Regular",
} as const;

export type Weight = "400" | "500" | "600" | "700" | "800";

const SANS: Record<Weight, string> = {
  "400": "IBMPlexSans_400Regular",
  "500": "IBMPlexSans_500Medium",
  "600": "IBMPlexSans_600SemiBold",
  "700": "IBMPlexSans_700Bold",
  "800": "IBMPlexSans_700Bold",
};

const ARABIC: Record<Weight, string> = {
  "400": "IBMPlexSansArabic_400Regular",
  "500": "IBMPlexSansArabic_500Medium",
  "600": "IBMPlexSansArabic_600SemiBold",
  "700": "IBMPlexSansArabic_700Bold",
  "800": "IBMPlexSansArabic_700Bold",
};

/** Registered family for a weight in a given language. */
export function fontFor(weight: Weight = "400", arabic = false): string {
  return (arabic ? ARABIC : SANS)[weight];
}

/**
 * Maps a numeric CSS-ish weight (what styles in this codebase already use) onto
 * the closest available step. 800 and 900 both collapse to Bold because IBM Plex
 * ships no heavier cut.
 */
export function weightFrom(numeric: string | number | undefined): Weight {
  const n = typeof numeric === "string" ? parseInt(numeric, 10) : numeric;
  if (n == null || Number.isNaN(n)) return "400";
  if (n <= 450) return "400";
  if (n <= 550) return "500";
  if (n <= 650) return "600";
  return "700";
}

/**
 * React Native exposes the platform default as a generic name. Leaving that on a
 * custom-family view can make iOS fall back to the system font for the whole
 * subtree, so we strip it and let the family decide.
 */
export function normalizeFamily(family: unknown): string | undefined {
  if (typeof family !== "string") return undefined;
  if (!family || family === "System" || family === "sans-serif") return undefined;
  return family;
}
