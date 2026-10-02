import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { useSettings } from "../store/settings";
import { Card, SectionTitle, SegmentedControl, Button, Badge } from "../components/ui";
import { GradientMesh } from "../components/visuals";
import { useI18n } from "../i18n";
import { findPrimePeriods, BADGES, badgeText } from "../domain/achievements";
import { daysSince } from "../domain/plan";
import { AnimatedEmoji } from "../components/motion/AnimatedEmoji";
import { AnalyticsSection } from "../components/analytics";
import { Screen, Section } from "../components/layout";
import { useEntitlements } from "../store/entitlements";
import { openChat, openPaywall } from "../ai/bus";

type Range = "week" | "fortnight" | "month" | "twomonth" | "year";

const RANGE_DAYS: Record<Range, number> = { week: 7, fortnight: 15, month: 30, twomonth: 60, year: 365 };

/**
 * Stats - one chart system (Nivo via `AnalyticsSection`), one calendar, badges
 * shown once. The old screen duplicated both a hand-rolled bar chart and a
 * heatmap alongside the analytics block; those are gone.
 */
export function StatsScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const { stats, sessions, books } = useData();
  const { restDays, reviewDays } = useSettings();
  const { t, lang } = useI18n();
  const { historyDays, isPro } = useEntitlements();
  const [range, setRange] = useState<Range>("month");

  // Free readers can only pick ranges inside their history window.
  const allowedDays = Math.min(RANGE_DAYS[range], historyDays);
  const days = allowedDays;

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
        reviewDays,
      ),
    [sessions, restDays, reviewDays],
  );

  const activeDays = series.filter((d) => d.minutes > 0).length;
  const rangeMinutes = series.reduce((a, d) => a + d.minutes, 0);
  const avgPerActive = activeDays ? Math.round(rangeMinutes / activeDays) : 0;

  const rangeOptions: { value: Range; label: string; locked?: boolean }[] = [
    { value: "week", label: t("stats.week") },
    { value: "fortnight", label: t("stats.fortnight") },
    { value: "month", label: t("stats.month") },
    { value: "twomonth", label: t("stats.twomonth"), locked: !isPro },
    { value: "year", label: t("stats.year"), locked: !isPro },
  ];

  return (
    <View style={{ flex: 1 }}>
      <GradientMesh />
      <Screen>
        <Text style={[styles.title, { color: c.text }]}>{t("stats.title")}</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>{t("stats.subtitle")}</Text>

        <SegmentedControl
          style={{ marginTop: 16 }}
          value={range}
          onChange={(v) => {
            if (RANGE_DAYS[v] > historyDays) {
              openPaywall();
              return;
            }
            setRange(v);
          }}
          options={rangeOptions.map((o) => ({ value: o.value, label: o.locked ? `${o.label} 🔒` : o.label }))}
        />

        {/* Journey start */}
        {stats.startDate ? (
          <Card style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <AnimatedEmoji size={24}>🗓️</AnimatedEmoji>
            <View style={{ flex: 1 }}>
              <Text style={{ color: c.text, fontSize: 14, fontWeight: "800" }}>{t("stats.journeyStart")}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12.5, marginTop: 2 }}>
                {t("stats.journeyStartValue", {
                  date: new Date(`${stats.startDate}T00:00:00Z`).toLocaleDateString(
                    lang === "ar" ? "ar-EG" : "en-GB",
                    { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" },
                  ),
                })}
              </Text>
            </View>
            <Badge text={t("stats.journeyDays", { count: daysSince(stats.startDate) })} tone="primary" />
          </Card>
        ) : null}

        <View style={styles.kpiGrid}>
          <Kpi label={t("stats.currentStreak")} value={t("stats.daysShort", { count: stats.streak })} accent />
          <Kpi label={t("stats.bestStreak")} value={t("stats.daysShort", { count: stats.bestStreak })} />
          <Kpi label={t("stats.activeDays")} value={`${activeDays}`} />
          <Kpi label={t("stats.missedDays")} value={`${stats.missed}`} />
        </View>

        {!isPro ? (
          <Pressable onPress={openPaywall} accessibilityRole="button" style={{ marginTop: 14 }}>
            <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, borderColor: c.premium }}>
              <Text style={{ fontSize: 18 }}>✨</Text>
              <Text style={{ flex: 1, color: c.text, fontSize: 13, fontWeight: "700" }}>
                {t("paywall.gateHistory", { count: historyDays })}
              </Text>
              <Text style={{ color: c.premium, fontSize: 13, fontWeight: "800" }}>{t("paywall.pro")} ›</Text>
            </Card>
          </Pressable>
        ) : null}

        {/* The single chart system. */}
        <AnalyticsSection />

        {/* Prime periods */}
        <Section>
          <Card>
            <SectionTitle right={<AnimatedEmoji size={20}>🌟</AnimatedEmoji>}>{t("stats.prime")}</SectionTitle>
            <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("stats.primeDesc")}</Text>
            {primes.length === 0 ? (
              <Text style={{ color: c.textFaint, fontSize: 13 }}>{t("stats.primeNone")}</Text>
            ) : (
              primes
                .slice(-4)
                .reverse()
                .map((p) => (
                  <View
                    key={`${p.start}-${p.end}`}
                    style={[styles.primeRow, { borderColor: c.border, backgroundColor: c.primarySoft }]}
                  >
                    <Text style={{ fontSize: 18 }}>🌟</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.primary, fontSize: 13.5, fontWeight: "800" }}>
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
        </Section>

        {/* Where the time went. */}
        <Section>
          <Card>
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
        </Section>

        {/* Insights CTA */}
        <Section>
          <Card>
            <SectionTitle right={<AnimatedEmoji size={20}>🔖</AnimatedEmoji>}>{t("stats.insights")}</SectionTitle>
            <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("stats.insightsHint")}</Text>
            <Button label={t("stats.askCoach")} variant="gradient" onPress={() => openChat(t("stats.askCoach"))} />
          </Card>
        </Section>

        {/* Milestones - the one canonical badge list. */}
        <Section>
          <Card>
            <SectionTitle>{t("stats.milestones")}</SectionTitle>
            <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 12 }}>{t("stats.milestonesHint")}</Text>
            {BADGES.map((b) => {
              const got = stats.streak >= b.days;
              const meta = badgeText(b, lang);
              return (
                <View key={b.id} style={styles.milestoneRow}>
                  <Text style={{ fontSize: 17, opacity: got ? 1 : 0.5 }}>{got ? b.icon : "🔒"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: got ? c.text : c.textMuted, fontSize: 13.5, fontWeight: "800" }}>
                      {meta.title}
                    </Text>
                    <Text style={{ color: c.textFaint, fontSize: 11.5, marginTop: 1 }}>{meta.desc}</Text>
                  </View>
                  <Badge
                    text={got ? t("stats.unlocked") : t("stats.inDays", { count: b.days - stats.streak })}
                    tone={got ? "success" : "neutral"}
                  />
                </View>
              );
            })}
          </Card>
        </Section>

        {/* Averages */}
        <Section>
          <Card>
            <SectionTitle>{t("stats.averages")}</SectionTitle>
            <Row label={t("stats.sessionsLogged")} value={`${stats.totalSessions}`} />
            <Row label={t("stats.avgSession")} value={`${avgPerActive} min`} />
            <Row label={t("stats.thisWeek")} value={`${stats.weekMinutes} min`} />
            <Row label={t("stats.booksFinished")} value={`${stats.booksFinished}`} />
          </Card>
        </Section>
      </Screen>
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
      <Text style={{ color: c.text, fontSize: 14, fontWeight: "800" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  subtitle: { fontSize: 13, marginTop: 2 },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 16 },
  kpi: { width: "47%", alignItems: "center", paddingVertical: 18 },
  kpiValue: { fontSize: 27, fontWeight: "900" },
  kpiLabel: { fontSize: 12, marginTop: 3, textAlign: "center" },
  primeRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 8 },
  bookBarRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  bookName: { fontSize: 13, width: 92 },
  bookBarTrack: { flex: 1, height: 8, borderRadius: 999, backgroundColor: "rgba(128,128,128,0.18)", overflow: "hidden" },
  bookBarFill: { height: "100%", borderRadius: 999 },
  bookMinutes: { fontSize: 12, width: 42, textAlign: "right" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7 },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 9 },
});
