import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { useSettings } from "../store/settings";
import { Card, SectionTitle, SegmentedControl, Button } from "../components/ui";
import { Heatmap } from "../components/Heatmap";
import { GridBackground, AuroraBackdrop } from "../components/visuals";
import { useI18n } from "../i18n";
import { findPrimePeriods } from "../domain/achievements";
import { AnimatedEmoji } from "../components/motion/AnimatedEmoji";
import { openChat } from "../ai/bus";

type Range = "week" | "month" | "quarter" | "year";

const RANGE_DAYS: Record<Range, number> = { week: 7, month: 30, quarter: 90, year: 365 };

export function StatsScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { stats, sessions, books } = useData();
  const { restDays } = useSettings();
  const { t } = useI18n();
  const [range, setRange] = useState<Range>("month");

  const days = RANGE_DAYS[range];

  const series = useMemo(() => {
    const out: { date: string; minutes: number; pages: number }[] = [];
    const byDay = new Map<string, { minutes: number; pages: number }>();
    for (const s of sessions) {
      const k = s.started_at.slice(0, 10);
      const cur = byDay.get(k) ?? { minutes: 0, pages: 0 };
      cur.minutes += s.minutes;
      cur.pages += s.pages_read;
      byDay.set(k, cur);
    }
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const k = d.toISOString().slice(0, 10);
      const v = byDay.get(k) ?? { minutes: 0, pages: 0 };
      out.push({ date: k, ...v });
    }
    return out;
  }, [days, sessions]);

  // The bar chart can't show 365 bars legibly, so bucket by week for long ranges.
  const bars = useMemo(() => {
    if (days <= 30) return series.map((d) => ({ date: d.date, minutes: d.minutes }));
    const bucket = days <= 90 ? 7 : 30;
    const out: { date: string; minutes: number }[] = [];
    for (let i = 0; i < series.length; i += bucket) {
      const slice = series.slice(i, i + bucket);
      out.push({ date: slice[0].date, minutes: slice.reduce((a, d) => a + d.minutes, 0) });
    }
    return out;
  }, [days, series]);

  const maxBar = Math.max(1, ...bars.map((b) => b.minutes));

  const byBook = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      if (!s.book_id) continue;
      map.set(s.book_id, (map.get(s.book_id) ?? 0) + s.minutes);
    }
    return [...map.entries()]
      .map(([id, minutes]) => ({ book: books.find((b) => b.id === id), minutes }))
      .filter((x) => x.book)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
  }, [sessions, books]);

  const maxBook = Math.max(1, ...byBook.map((b) => b.minutes));

  const primes = useMemo(
    () =>
      findPrimePeriods(
        sessions.map((s) => ({ date: s.started_at.slice(0, 10), applied: s.applied_yesterday })),
        restDays,
      ),
    [sessions, restDays],
  );

  const activeDays = series.filter((d) => d.minutes > 0).length;
  const rangeMinutes = series.reduce((a, d) => a + d.minutes, 0);
  const avgPerActive = activeDays ? Math.round(rangeMinutes / activeDays) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GridBackground />
      <AuroraBackdrop />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 150, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: c.text }]}>{t("stats.title")}</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>{t("stats.subtitle")}</Text>

        <SegmentedControl
          style={{ marginTop: 16 }}
          value={range}
          onChange={setRange}
          options={[
            { value: "week", label: t("stats.week") },
            { value: "month", label: t("stats.month") },
            { value: "quarter", label: t("stats.quarter") },
            { value: "year", label: t("stats.year") },
          ]}
        />

        <View style={styles.kpiGrid}>
          <Kpi label={t("stats.currentStreak")} value={t("stats.daysShort", { count: stats.streak })} accent />
          <Kpi label={t("stats.bestStreak")} value={t("stats.daysShort", { count: stats.bestStreak })} />
          <Kpi label={t("stats.activeDays")} value={`${activeDays}`} />
          <Kpi label={t("stats.missedDays")} value={`${stats.missed}`} />
        </View>

        <Card style={{ marginTop: 16 }}>
          <SectionTitle right={<Text style={{ color: c.textMuted, fontSize: 12 }}>{rangeMinutes} min</Text>}>
            {t("stats.range")}
          </SectionTitle>
          <View style={styles.chart}>
            {bars.map((d, i) => {
              const h = Math.max(3, (d.minutes / maxBar) * 96);
              return (
                <View key={`${d.date}-${i}`} style={styles.barWrap}>
                  <View style={[styles.bar, { height: h, backgroundColor: d.minutes > 0 ? c.primary : c.surfaceAlt }]} />
                </View>
              );
            })}
          </View>
          <View style={styles.chartAxis}>
            <Text style={[styles.axisText, { color: c.textFaint }]}>{bars[0]?.date.slice(5)}</Text>
            <Text style={[styles.axisText, { color: c.textFaint }]}>{bars[bars.length - 1]?.date.slice(5)}</Text>
          </View>
        </Card>

        <Card style={{ marginTop: 16 }}>
          <SectionTitle>{t("stats.consistency")}</SectionTitle>
          <Heatmap days={stats.last30} />
        </Card>

        {/* Prime periods */}
        <Card style={{ marginTop: 16 }}>
          <SectionTitle right={<AnimatedEmoji size={20}>🌟</AnimatedEmoji>}>{t("stats.prime")}</SectionTitle>
          <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("stats.primeDesc")}</Text>
          {primes.length === 0 ? (
            <Text style={{ color: c.textFaint, fontSize: 13 }}>{t("stats.primeNone")}</Text>
          ) : (
            primes.slice(-4).reverse().map((p) => (
              <View key={`${p.start}-${p.end}`} style={[styles.primeRow, { borderColor: c.border, backgroundColor: c.primarySoft }]}>
                <Text style={{ fontSize: 18 }}>🌟</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.primary, fontSize: 13.5, fontWeight: "700" }}>
                    {p.start.slice(5)} → {p.end.slice(5)}
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 12 }}>
                    {t("stats.primeDays", { days: p.days, rate: Math.round(p.appliedRate * 100) })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>

        <Card style={{ marginTop: 16 }}>
          <SectionTitle>{t("stats.whereTime")}</SectionTitle>
          {byBook.length === 0 ? (
            <Text style={{ color: c.textMuted, fontSize: 13.5 }}>{t("stats.noBreakdown")}</Text>
          ) : (
            byBook.map(({ book, minutes }) => (
              <View key={book!.id} style={styles.bookBarRow}>
                <View style={[styles.dot, { backgroundColor: book!.cover_color ?? c.primary }]} />
                <Text style={[styles.bookName, { color: c.text }]} numberOfLines={1}>
                  {book!.title}
                </Text>
                <View style={styles.bookBarTrack}>
                  <View
                    style={[
                      styles.bookBarFill,
                      { width: `${(minutes / maxBook) * 100}%`, backgroundColor: book!.cover_color ?? c.primary },
                    ]}
                  />
                </View>
                <Text style={[styles.bookMinutes, { color: c.textMuted }]}>{minutes}m</Text>
              </View>
            ))
          )}
        </Card>

        <Card style={{ marginTop: 16 }}>
          <SectionTitle right={<AnimatedEmoji size={20}>🦉</AnimatedEmoji>}>{t("stats.insights")}</SectionTitle>
          <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("stats.insightsHint")}</Text>
          <Button
            label={t("stats.askCoach")}
            onPress={() => openChat(t("stats.askCoach"))}
          />
        </Card>

        <Card style={{ marginTop: 16 }}>
          <SectionTitle>{t("stats.averages")}</SectionTitle>
          <Row label={t("stats.sessionsLogged")} value={`${stats.totalSessions}`} />
          <Row label={t("stats.avgSession")} value={`${avgPerActive} min`} />
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
  subtitle: { fontSize: 13, marginTop: 2 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  kpi: { width: "47%", alignItems: "center", paddingVertical: 18 },
  kpiValue: { fontSize: 26, fontWeight: "800" },
  kpiLabel: { fontSize: 12, marginTop: 3, textAlign: "center" },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 5, height: 104 },
  barWrap: { flex: 1, justifyContent: "flex-end" },
  bar: { borderRadius: 5 },
  chartAxis: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  axisText: { fontSize: 11 },
  primeRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  bookBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bookName: { fontSize: 13, width: 92 },
  bookBarTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: "rgba(128,128,128,0.18)", overflow: "hidden" },
  bookBarFill: { height: "100%", borderRadius: 999 },
  bookMinutes: { fontSize: 12, width: 42, textAlign: "right" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
});
