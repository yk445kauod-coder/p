import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { useSettings } from "../store/settings";
import { useI18n } from "../i18n";
import { Card, ProgressBar, SectionTitle, Badge } from "../components/ui";
import { RingProgress } from "../components/RingProgress";
import { Heatmap } from "../components/Heatmap";
import { Logo } from "../components/Logo";
import { GridBackground, AuroraBackdrop } from "../components/visuals";
import { LogSessionSheet } from "../components/LogSessionSheet";

export function HomeScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { stats, books, goals } = useData();
  const { dailyGoalMinutes } = useSettings();
  const { t } = useI18n();
  const [logOpen, setLogOpen] = useState(false);

  const reading = useMemo(() => books.filter((b) => b.status === "reading"), [books]);
  const primary = reading[0];
  const goalPct = dailyGoalMinutes > 0 ? stats.todayMinutes / dailyGoalMinutes : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t("home.greetingMorning");
    if (h < 18) return t("home.greetingAfternoon");
    return t("home.greetingEvening");
  })();

  const totalBooks = books.length;
  const finished = stats.booksFinished;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GridBackground />
      <AuroraBackdrop />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 140, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: c.textMuted }]}>{greeting}</Text>
            <Text style={[styles.appName, { color: c.text }]}>TraceBook</Text>
          </View>
          <Logo size={44} animated />
        </View>

        {/* Streak banner */}
        <Card style={styles.streakCard}>
          <View style={styles.streakRow}>
            <Text style={styles.flame}>🔥</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.streakValue, { color: c.text }]}>
                {stats.streak === 1
                  ? t("home.streakDays")
                  : t("home.streakDaysPlural", { count: stats.streak })}
              </Text>
              <Text style={[styles.streakLabel, { color: c.textMuted }]}>
                {stats.streak > 0 ? t("home.streakKeepGoing") : t("home.streakStart")}
              </Text>
            </View>
            <Badge text={t("home.best", { count: stats.bestStreak })} tone="accent" />
          </View>
        </Card>

        {/* Today's goal */}
        <Card style={styles.goalCard}>
          <View style={styles.goalRow}>
            <RingProgress
              value={goalPct}
              label={`${stats.todayMinutes}`}
              sublabel={t("home.ofMinutes", { count: dailyGoalMinutes })}
            />
            <View style={styles.goalMeta}>
              <Text style={[styles.goalTitle, { color: c.text }]}>{t("home.today")}</Text>
              <Text style={[styles.goalSub, { color: c.textMuted }]}>
                {t("home.pagesRead", { count: stats.todayPages })}
              </Text>
              <View style={styles.miniStats}>
                <MiniStat label={t("home.thisWeek")} value={`${stats.weekMinutes}m`} />
                <MiniStat label={t("home.allTime")} value={`${Math.round(stats.totalMinutes / 60)}h`} />
              </View>
            </View>
          </View>
        </Card>

        {/* Continue reading */}
        <SectionTitle>{t("home.continueReading")}</SectionTitle>
        {primary ? (
          <Card>
            <View style={styles.bookRow}>
              <View style={[styles.bookSpine, { backgroundColor: primary.coverColor ?? c.primary }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.bookTitle, { color: c.text }]} numberOfLines={1}>
                  {primary.title}
                </Text>
                <Text style={[styles.bookAuthor, { color: c.textMuted }]} numberOfLines={1}>
                  {primary.author ?? "Unknown author"}
                </Text>
                <View style={styles.progressRow}>
                  <ProgressBar
                    value={primary.totalPages ? primary.currentPage / primary.totalPages : 0}
                    color={primary.coverColor ?? c.primary}
                  />
                  <Text style={[styles.progressText, { color: c.textMuted }]}>
                    {primary.currentPage}/{primary.totalPages || "—"}
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={[styles.emptyText, { color: c.textMuted }]}>{t("home.noBook")}</Text>
          </Card>
        )}

        {/* Activity */}
        <View style={{ marginTop: 22 }}>
          <SectionTitle right={<Text style={{ color: c.textMuted, fontSize: 12 }}>{t("home.last30")}</Text>}>
            {t("home.activity")}
          </SectionTitle>
          <Card>
            <Heatmap days={stats.last30} />
            <View style={styles.legendRow}>
              <Text style={[styles.legendText, { color: c.textFaint }]}>{t("common.less")}</Text>
              {[0, 0.3, 0.6, 1].map((v) => (
                <View
                  key={v}
                  style={[
                    styles.legendCell,
                    {
                      backgroundColor:
                        v === 0 ? c.surfaceAlt : v > 0.6 ? c.primary : v > 0.3 ? `${c.primary}99` : `${c.primary}55`,
                    },
                  ]}
                />
              ))}
              <Text style={[styles.legendText, { color: c.textFaint }]}>{t("common.more")}</Text>
            </View>
          </Card>
        </View>

        {/* Library summary */}
        <View style={{ marginTop: 22 }}>
          <SectionTitle>{t("home.yourShelf")}</SectionTitle>
          <View style={styles.shelfRow}>
            <MiniCard label={t("home.books")} value={`${totalBooks}`} />
            <MiniCard label={t("home.finished")} value={`${finished}`} />
            <MiniCard label={t("home.sessions")} value={`${stats.totalSessions}`} />
          </View>
        </View>
      </ScrollView>

      {/* Floating primary action */}
      <Pressable
        onPress={() => setLogOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: c.primary, bottom: insets.bottom + 92, opacity: pressed ? 0.9 : 1 },
          theme.shadow,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Log a reading session"
      >
        <Text style={[styles.fabPlus, { color: c.bgElevated }]}>+</Text>
        <Text style={[styles.fabText, { color: c.bgElevated }]}>{t("home.logSession")}</Text>
      </Pressable>

      <LogSessionSheet visible={logOpen} onClose={() => setLogOpen(false)} />
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const c = useTheme().colors;
  return (
    <View style={styles.miniStat}>
      <Text style={[styles.miniStatValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.miniStatLabel, { color: c.textFaint }]}>{label}</Text>
    </View>
  );
}

function MiniCard({ label, value }: { label: string; value: string }) {
  const c = useTheme().colors;
  return (
    <Card style={styles.miniCard}>
      <Text style={[styles.miniCardValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.miniCardLabel, { color: c.textMuted }]}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  greeting: { fontSize: 13.5 },
  appName: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
  streakCard: { marginBottom: 14 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  flame: { fontSize: 28 },
  streakValue: { fontSize: 19, fontWeight: "800" },
  streakLabel: { fontSize: 12.5, marginTop: 1 },
  goalCard: { marginBottom: 20 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  goalMeta: { flex: 1, gap: 4 },
  goalTitle: { fontSize: 18, fontWeight: "700" },
  goalSub: { fontSize: 13 },
  miniStats: { flexDirection: "row", gap: 20, marginTop: 10 },
  miniStat: {},
  miniStatValue: { fontSize: 16, fontWeight: "700" },
  miniStatLabel: { fontSize: 11.5 },
  bookRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  bookSpine: { width: 8, height: 56, borderRadius: 4 },
  bookTitle: { fontSize: 16, fontWeight: "700" },
  bookAuthor: { fontSize: 12.5, marginTop: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  progressText: { fontSize: 11.5, minWidth: 54, textAlign: "right" },
  emptyText: { fontSize: 13.5, lineHeight: 20 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  legendCell: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: 11, marginHorizontal: 4 },
  shelfRow: { flexDirection: "row", gap: 12 },
  miniCard: { flex: 1, alignItems: "center", paddingVertical: 16, paddingHorizontal: 8 },
  miniCardValue: { fontSize: 22, fontWeight: "800" },
  miniCardLabel: { fontSize: 11.5, marginTop: 2 },
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    height: 54,
    borderRadius: 999,
  },
  fabPlus: { fontSize: 22, fontWeight: "700", marginTop: -2 },
  fabText: { fontSize: 15, fontWeight: "700" },
});
