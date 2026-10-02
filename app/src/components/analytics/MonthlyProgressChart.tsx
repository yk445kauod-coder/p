import React, { useMemo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Text } from "../Text";
import { useTheme } from "../../theme/ThemeProvider";
import { useI18n } from "../../i18n";
import type { MonthlyDatum, MonthlyMetric } from "./types";

export interface MonthlyProgressChartProps {
  data: MonthlyDatum[];
  metric?: MonthlyMetric;
  height?: number;
}

const CHART_HEIGHT = 200;

/**
 * Native fallback for the monthly bar chart.
 *
 * Bars are plain views, matching the range chart already on the Stats screen so
 * native and web read as the same component at different fidelity.
 */
export function MonthlyProgressChart({ data, metric = "pages", height = CHART_HEIGHT }: MonthlyProgressChartProps) {
  const theme = useTheme();
  const c = theme.colors;
  const { t, lang } = useI18n();
  const { width } = useWindowDimensions();

  const isPages = metric === "pages";
  const color = isPages
    ? theme.mode === "dark" ? "#7FBFA0" : "#3F6B57"
    : theme.mode === "dark" ? "#E8A87C" : "#C4622D";

  const monthLabel = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(lang === "ar" ? "ar-EG" : "en-GB", { month: "short", timeZone: "UTC" });
    return (month: string) => fmt.format(new Date(`${month}-01T00:00:00Z`));
  }, [lang]);

  const values = data.map((d) => (isPages ? d.pages : d.books));
  const max = Math.max(1, ...values);

  const slot = Math.max(22, Math.floor((width - 60) / Math.max(1, data.length)));
  const barWidth = Math.max(10, slot * 0.62);
  const needsScroll = data.length * slot > width - 60;

  const bars = (
    <View style={[styles.chart, { height, width: needsScroll ? data.length * slot : "100%" }]}>
      {data.map((d, i) => {
        const v = values[i];
        const h = Math.max(v > 0 ? 4 : 2, (v / max) * (height - 40));
        return (
          <View key={d.month} style={{ width: needsScroll ? slot : undefined, flex: needsScroll ? undefined : 1, alignItems: "center", justifyContent: "flex-end" }}>
            <Text style={[styles.value, { color: v > 0 ? c.text : c.textFaint }]} numberOfLines={1}>
              {v > 0 ? v.toLocaleString() : ""}
            </Text>
            <View
              accessibilityLabel={`${monthLabel(d.month)}: ${v}`}
              style={{ width: barWidth, height: h, borderRadius: 6, backgroundColor: v > 0 ? color : c.surfaceAlt }}
            />
            <Text style={[styles.month, { color: c.textFaint }]} numberOfLines={1}>
              {monthLabel(d.month)}
            </Text>
          </View>
        );
      })}
    </View>
  );

  return (
    <View accessibilityRole="image" accessibilityLabel={isPages ? t("analytics.monthlyA11yPages") : t("analytics.monthlyA11yBooks")}>
      {bars}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 6 },
  value: { fontSize: 10, marginBottom: 3 },
  month: { fontSize: 10.5, marginTop: 6 },
});
