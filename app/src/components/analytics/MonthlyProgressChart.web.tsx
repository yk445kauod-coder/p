import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "../Text";
import { ResponsiveBar } from "@nivo/bar";
import { useTheme } from "../../theme/ThemeProvider";
import { useI18n } from "../../i18n";
import { buildNivoTheme, monthlyColors } from "./theme";
import type { MonthlyDatum, MonthlyMetric } from "./types";

export interface MonthlyProgressChartProps {
  data: MonthlyDatum[];
  metric?: MonthlyMetric;
  /** Bars stay readable down to ~8px; below that they scroll. */
  height?: number;
}

const MIN_BAR = 14;
const CHART_HEIGHT = 240;

/**
 * Pages read (or books finished) per month.
 *
 * Nivo picks the colour from a per-key scale, so switching metric only changes
 * which field is plotted — the axis, tooltip and animation config stay shared.
 */
export function MonthlyProgressChart({ data, metric = "pages", height = CHART_HEIGHT }: MonthlyProgressChartProps) {
  const theme = useTheme();
  const c = theme.colors;
  const { t, lang } = useI18n();
  const { width } = useWindowDimensions();
  const nivoTheme = useMemo(() => buildNivoTheme(theme, lang === "ar"), [theme, lang]);
  const palette = monthlyColors(theme);

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { month: "short", timeZone: "UTC" });
    return (month: string) => fmt.format(new Date(`${month}-01T00:00:00Z`));
  }, [lang]);

  const rows = useMemo(
    () => data.map((d) => ({ month: monthLabel(d.month), pages: d.pages, books: d.books })),
    [data, monthLabel],
  );

  const isPages = metric === "pages";
  const color = isPages ? palette.pages : palette.books;

  const chartWidth = Math.max(width - 40, rows.length * (MIN_BAR + 14));
  const needsScroll = chartWidth > width - 40;

  const Tooltip = useMemo(() => {
    function MonthlyTooltip({
      value,
      indexValue,
    }: {
      id: string | number;
      value: number | string;
      indexValue: string | number;
    }) {
      return (
        <View style={[styles.tip, { backgroundColor: c.bgElevated, borderColor: c.border }]}>
          <View style={[styles.tipDot, { backgroundColor: color }]} />
          <View>
            <Text style={[styles.tipValue, { color: c.text }]}>
              {String(indexValue)} · {Number(value).toLocaleString()}{" "}
              {isPages ? t("analytics.pagesShort") : t("analytics.booksShort")}
            </Text>
            <Text style={[styles.tipDay, { color: c.textMuted }]}>
              {isPages ? t("analytics.pagesLabel") : t("analytics.booksLabel")}
            </Text>
          </View>
        </View>
      );
    }
    return MonthlyTooltip;
  }, [c, color, isPages, t]);

  const bar = (
    <View style={{ width: needsScroll ? chartWidth : "100%", height }}>
      <ResponsiveBar
        data={rows}
        keys={[metric]}
        indexBy="month"
        theme={nivoTheme}
        colors={[color]}
        margin={{ top: 12, right: 12, bottom: 40, left: 44 }}
        padding={0.32}
        valueScale={{ type: "linear" }}
        indexScale={{ type: "band", round: true }}
        borderRadius={6}
        borderWidth={0}
        enableLabel={false}
        enableGridX={false}
        enableGridY
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 0,
          tickPadding: 10,
          tickRotation: 0,
          legend: "",
        }}
        axisLeft={{
          tickSize: 0,
          tickPadding: 8,
          tickRotation: 0,
          legend: "",
          legendOffset: -36,
          legendPosition: "middle",
        }}
        valueFormat={(v) => String(v)}
        tooltip={Tooltip}
        animate
        motionConfig="gentle"
        role="img"
      />
    </View>
  );

  return needsScroll ? (
    // Long ranges would squash the bars, so they scroll instead.
    <View style={{ width: "100%" }}>
      <View style={{ width: chartWidth }}>{bar}</View>
    </View>
  ) : (
    bar
  );
}

const styles = StyleSheet.create({
  tip: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 12, paddingVertical: 7, paddingHorizontal: 11 },
  tipDot: { width: 9, height: 9, borderRadius: 3 },
  tipValue: { fontSize: 12.5, fontWeight: "700" },
  tipDay: { fontSize: 11, marginTop: 1 },
});
