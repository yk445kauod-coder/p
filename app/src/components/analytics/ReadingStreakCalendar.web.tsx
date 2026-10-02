import React, { useMemo } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "../Text";
import { ResponsiveTimeRange } from "@nivo/calendar";
import { useTheme } from "../../theme/ThemeProvider";
import { useI18n } from "../../i18n";
import { buildNivoTheme, streakColors } from "./theme";
import type { CalendarDatum } from "./types";

const CELL = 13;
const SPACING = 3;
const WEEKDAY_GUTTER = 30;
const TOP = 20;

/** Weeks needed to cover `days` back from today, ending on the current week. */
function rangeForDays(days: number) {
  const today = new Date();
  const to = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export interface ReadingStreakCalendarProps {
  data: CalendarDatum[];
  /** Rolling window in days. Defaults to a full year. */
  days?: number;
}

/**
 * GitHub-style contribution calendar of pages read per day.
 *
 * A full year is wider than a phone, so the chart lives in a horizontal
 * scroller (the same approach GitHub uses on mobile) rather than shrinking the
 * cells into illegibility.
 */
export function ReadingStreakCalendar({ data, days = 365 }: ReadingStreakCalendarProps) {
  const theme = useTheme();
  const { t, lang } = useI18n();
  const { width } = useWindowDimensions();
  const nivoTheme = useMemo(() => buildNivoTheme(theme, lang === "ar"), [theme, lang]);
  const colors = streakColors(theme);

  const range = useMemo(() => rangeForDays(days), [days]);

  // Locale-aware short labels; Nivo rotates these so the first weekday sits on
  // the correct row for the reader's region.
  const weekdays = useMemo(
    () =>
      lang === "ar"
        ? ["ح", "ن", "ث", "ر", "خ", "ج", "س"]
        : ["S", "M", "T", "W", "T", "F", "S"],
    [lang],
  );

  const firstWeekday = lang === "ar" ? "saturday" : "sunday";

  const monthLegend = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
      month: "short",
      timeZone: "UTC",
    });
    return (_year: number, _month: number, date: Date) => fmt.format(date);
  }, [lang]);

  const dayLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    return (day: string) => fmt.format(new Date(`${day}T00:00:00Z`));
  }, [lang]);

  const chartWidth = useMemo(() => {
    const weeks = Math.ceil(days / 7) + 1;
    return WEEKDAY_GUTTER + weeks * (CELL + SPACING) + SPACING;
  }, [days]);

  const Tooltip = useMemo(() => {
    function CalendarTooltip({ day, value }: { day: string; value: string }) {
      return (
        <View style={[styles.tip, { backgroundColor: theme.colors.bgElevated, borderColor: theme.colors.border }]}>
          <View style={[styles.tipDot, { backgroundColor: theme.colors.primary }]} />
          <View>
            <Text style={[styles.tipValue, { color: theme.colors.text }]}>
              {t("analytics.pagesValue", { count: Number(value) || 0 })}
            </Text>
            <Text style={[styles.tipDay, { color: theme.colors.textMuted }]}>{dayLabel(day)}</Text>
          </View>
        </View>
      );
    }
    return CalendarTooltip;
  }, [theme, t, dayLabel]);

  // On wide screens the year fits; on phones it scrolls horizontally.
  const needsScroll = width - 40 < chartWidth;
  const chart = (
    <View style={{ width: needsScroll ? chartWidth : "100%", height: CELL * 7 + SPACING * 8 + TOP }}>
      <ResponsiveTimeRange
        data={data}
        from={range.from}
        to={range.to}
        theme={nivoTheme}
        colors={colors}
        emptyColor={theme.colors.surfaceAlt}
        minValue={0}
        maxValue="auto"
        square
        dayRadius={3}
        daySpacing={SPACING}
        dayBorderWidth={0}
        weekdayLegendOffset={WEEKDAY_GUTTER}
        weekdays={weekdays}
        weekdayTicks={[1, 3, 5]}
        firstWeekday={firstWeekday}
        monthLegend={monthLegend}
        monthLegendOffset={12}
        margin={{ top: TOP, right: 8, bottom: 4, left: 0 }}
        valueFormat={(v) => String(v)}
        role="img"
        tooltip={Tooltip}
      />
    </View>
  );

  return (
    <View accessibilityRole="image" accessibilityLabel={t("analytics.calendarA11y")}>
      {needsScroll ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
          {chart}
        </ScrollView>
      ) : (
        chart
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 11 },
  tipDot: { width: 9, height: 9, borderRadius: 3 },
  tipValue: { fontSize: 12.5, fontWeight: "700" },
  tipDay: { fontSize: 11, marginTop: 1 },
});
