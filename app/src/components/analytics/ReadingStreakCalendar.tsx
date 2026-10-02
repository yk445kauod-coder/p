import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/ThemeProvider";
import { useI18n } from "../../i18n";
import type { CalendarDatum } from "./types";

const CELL = 13;
const GAP = 3;
const WEEKS = 53;

function startOfGridWeek(d: Date, weekStartsOn: number): Date {
  const out = new Date(d);
  const shift = (out.getUTCDay() - weekStartsOn + 7) % 7;
  out.setUTCDate(out.getUTCDate() - shift);
  return out;
}

/**
 * Native fallback for the streak calendar.
 *
 * Mirrors the web GitHub-style grid with plain views — react-native-svg could
 * draw it, but rects in a ScrollView keep the layout cheap and identical to the
 * existing `Heatmap` component.
 */
export function ReadingStreakCalendar({ data, days = 365 }: { data: CalendarDatum[]; days?: number }) {
  const theme = useTheme();
  const c = theme.colors;
  const { t, lang } = useI18n();
  const ramp = theme.mode === "dark"
    ? ["#1E2E26", "#2C4A3A", "#3D6E55", "#55A07B", "#8FD3AE"]
    : ["#E4EFE8", "#BBD8C6", "#88BCA0", "#559B79", "#2F6B50"];

  const weekStartsOn = lang === "ar" ? 6 : 0;

  const { columns, max } = useMemo(() => {
    const byDay = new Map(data.map((d) => [d.day, d.value]));
    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    const gridStart = startOfGridWeek(new Date(todayUTC.getTime() - days * 86_400_000), weekStartsOn);
    const cols: (number | null)[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: (number | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(gridStart.getTime() + (w * 7 + d) * 86_400_000);
        col.push(date > todayUTC ? null : (byDay.get(date.toISOString().slice(0, 10)) ?? 0));
      }
      cols.push(col);
    }
    return { columns: cols, max: Math.max(1, ...data.map((d) => d.value)) };
  }, [data, days, weekStartsOn]);

  const shade = (v: number | null) => {
    if (v === null) return "transparent";
    if (v <= 0) return c.surfaceAlt;
    const level = v / max;
    return level > 0.75 ? ramp[4] : level > 0.5 ? ramp[3] : level > 0.25 ? ramp[2] : ramp[1];
  };

  return (
    <View accessibilityRole="image" accessibilityLabel={t("analytics.calendarA11y")}>
      <View style={styles.grid}>
        {columns.map((col, ci) => (
          <View key={ci} style={styles.col}>
            {col.map((v, ri) => (
              <View key={ri} style={[styles.cell, { backgroundColor: shade(v), borderColor: c.border }]} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", gap: GAP },
  col: { gap: GAP },
  cell: { width: CELL, height: CELL, borderRadius: 3, borderWidth: StyleSheet.hairlineWidth },
});
