import React, { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Circle } from "react-native-svg";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { Card, SectionTitle } from "../components/ui";
import { Heatmap } from "../components/Heatmap";
import { GridBackground, AuroraBackdrop } from "../components/visuals";
import { useI18n } from "../i18n";

export function StatsScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { stats, sessions, books } = useData();
  const { t } = useI18n();

  const weekly = useMemo(() => stats.last30.slice(-14), [stats.last30]);
  const maxWeek = Math.max(30, ...weekly.map((d) => d.minutes));

  const byBook = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      if (!s.bookId) continue;
      map.set(s.bookId, (map.get(s.bookId) ?? 0) + s.minutes);
    }
    return [...map.entries()]
      .map(([id, minutes]) => ({ book: books.find((b) => b.id === id), minutes }))
      .filter((x) => x.book)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
  }, [sessions, books]);

  const maxBook = Math.max(1, ...byBook.map((b) => b.minutes));

  const avg = stats.totalSessions ? Math.round(stats.totalMinutes / stats.totalSessions) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GridBackground />
      <AuroraBackdrop />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 140, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: c.text }]}>{t("stats.title")}</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>{t("stats.subtitle")}</Text>

        <View style={styles.kpiGrid}>
          <Kpi label={t("stats.currentStreak")} value={t("stats.daysShort", { count: stats.streak })} accent />
          <Kpi label={t("stats.bestStreak")} value={t("stats.daysShort", { count: stats.bestStreak })} />
          <Kpi label={t("stats.totalTime")} value={t("stats.hoursShort", { count: Math.round(stats.totalMinutes / 60) })} />
          <Kpi label={t("stats.pagesRead")} value={`${stats.totalPages}`} />
        </View>

        <Card style={{ marginTop: 16 }}>
          <SectionTitle>{t("stats.daily14")}</SectionTitle>
          <View style={styles.chart}>
            {weekly.map((d) => {
              const h = Math.max(3, (d.minutes / maxWeek) * 96);
              return (
                <View key={d.date} style={styles.barWrap}>
                  <View
                    style={[
                      styles.bar,
                      { height: h, backgroundColor: d.minutes > 0 ? c.primary : c.surfaceAlt },
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.chartAxis}>
            <Text style={[styles.axisText, { color: c.textFaint }]}>{weekly[0]?.date.slice(5)}</Text>
            <Text style={[styles.axisText, { color: c.textFaint }]}>{weekly[weekly.length - 1]?.date.slice(5)}</Text>
          </View>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <SectionTitle>{t("stats.consistency")}</SectionTitle>
          <Heatmap days={stats.last30} />
        </Card>

        <Card style={{ marginTop: 16 }}>
          <SectionTitle>{t("stats.whereTime")}</SectionTitle>
          {byBook.length === 0 ? (
            <Text style={{ color: c.textMuted, fontSize: 13.5 }}>{t("stats.noBreakdown")}</Text>
          ) : (
            byBook.map(({ book, minutes }) => (
              <View key={book!.id} style={styles.bookBarRow}>
                <View style={[styles.dot, { backgroundColor: book!.coverColor ?? c.primary }]} />
                <Text style={[styles.bookName, { color: c.text }]} numberOfLines={1}>
                  {book!.title}
                </Text>
                <View style={styles.bookBarTrack}>
                  <View
                    style={[
                      styles.bookBarFill,
                      { width: `${(minutes / maxBook) * 100}%`, backgroundColor: book!.coverColor ?? c.primary },
                    ]}
                  />
                </View>
                <Text style={[styles.bookMinutes, { color: c.textMuted }]}>{minutes}m</Text>
              </View>
            ))
          )}
        </Card>

        <Card style={{ marginTop: 16 }}>
          <SectionTitle>{t("stats.averages")}</SectionTitle>
          <Row label={t("stats.sessionsLogged")} value={`${stats.totalSessions}`} />
          <Row label={t("stats.averageSession")} value={`${avg} min`} />
          <Row label={t("stats.thisWeek")} value={`${stats.weekMinutes} min`} />
          <Row label={t("stats.booksFinished")} value={`${stats.booksFinished}`} />
        </Card>
      </ScrollView>
    </View>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  const c = useTheme().colors;
  return (
    <Card style={styles.kpi}>
      <Text style={[styles.kpiValue, { color: accent ? c.accent : c.text }]}>{value}</Text>
      <Text style={[styles.kpiLabel, { color: c.textMuted }]}>{label}</Text>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const c = useTheme().colors;
  return (
    <View style={styles.row}>
      <Text style={{ color: c.textMuted, fontSize: 13.5 }}>{label}</Text>
      <Text style={{ color: c.text, fontSize: 14, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: 16 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  kpi: { width: "47%", alignItems: "center", paddingVertical: 18 },
  kpiValue: { fontSize: 26, fontWeight: "800" },
  kpiLabel: { fontSize: 12, marginTop: 3 },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 5, height: 104 },
  barWrap: { flex: 1, justifyContent: "flex-end" },
  bar: { borderRadius: 5 },
  chartAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  axisText: { fontSize: 11 },
  bookBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bookName: { fontSize: 13, width: 92 },
  bookBarTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: "rgba(128,128,128,0.18)", overflow: "hidden" },
  bookBarFill: { height: "100%", borderRadius: 999 },
  bookMinutes: { fontSize: 12, width: 42, textAlign: "right" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
});
