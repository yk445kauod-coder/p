import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { useSettings, RITUAL_DRINKS } from "../store/settings";
import { useI18n } from "../i18n";
import { Card, ProgressBar, SectionTitle, Badge, StatTile } from "../components/ui";
import { RingProgress } from "../components/RingProgress";
import { Heatmap } from "../components/Heatmap";
import { Logo } from "../components/Logo";
import { GridBackground, AuroraBackdrop } from "../components/visuals";
import { LogSessionSheet } from "../components/LogSessionSheet";
import { AnimatedEmoji } from "../components/motion/AnimatedEmoji";
import { PlanBar } from "../components/PlanBar";
import { DailyTakeawayCard } from "../components/DailyTakeawayCard";
import { badgeText, nextBadge, unlockedBadges, BADGES } from "../domain/achievements";
import { computePlan, badgeProgress } from "../domain/plan";
import { dailyQuote } from "../domain/quotes";

export function HomeScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { stats, books, futureBooks } = useData();
  const { dailyGoalMinutes, ritualDrink, restDays, reviewDays, dailyPagesGoal, shelfGoalPages } = useSettings();
  const { t, lang } = useI18n();
  const [logOpen, setLogOpen] = useState(false);
  const [quoteOffset, setQuoteOffset] = useState(0);

  const reading = useMemo(() => books.filter((b) => b.status === "reading"), [books]);
  const primary = reading[0];
  const goalPct = dailyGoalMinutes > 0 ? stats.todayMinutes / dailyGoalMinutes : 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return t("home.greetingMorning");
    if (h < 18) return t("home.greetingAfternoon");
    return t("home.greetingEvening");
  })();

  const quote = useMemo(() => dailyQuote(lang, new Date(), quoteOffset), [lang, quoteOffset]);
  const unlocked = useMemo(() => unlockedBadges(stats.streak), [stats.streak]);
  const next = useMemo(() => nextBadge(stats.streak), [stats.streak]);

  const isRestToday = restDays.includes(new Date().getDay());
  const isReviewToday = reviewDays.includes(new Date().getDay());
  const loggedToday = stats.todayMinutes > 0;

  const plan = useMemo(
    () =>
      computePlan({
        totalPages: primary?.total_pages ?? 0,
        currentPage: primary?.current_page ?? 0,
        dailyPagesGoal,
        offDays: [...restDays, ...reviewDays],
      }),
    [primary?.current_page, primary?.total_pages, dailyPagesGoal, restDays, reviewDays],
  );

  const shelfPct = primary && shelfGoalPages > 0 ? Math.min(1, primary.current_page / shelfGoalPages) : 0;
  const pagesLeft = plan.pagesLeft;

  const ritual = RITUAL_DRINKS.find((d) => d.id === ritualDrink) ?? RITUAL_DRINKS[0];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GridBackground />
      <AuroraBackdrop />

      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 150, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: c.textMuted }]}>{greeting}</Text>
            <Text style={[styles.appName, { color: c.text }]}>TraceBook</Text>
          </View>
          <Logo size={44} animated />
        </View>

        {/* Streak */}
        <Card style={styles.streakCard}>
          <View style={styles.streakRow}>
            <AnimatedEmoji size={30} trigger={stats.streak} loop={stats.streak > 0}>
              {stats.streak > 0 ? "🔥" : "🌱"}
            </AnimatedEmoji>
            <View style={{ flex: 1 }}>
              <Text style={[styles.streakValue, { color: c.text }]}>
                {stats.streak === 1 ? t("home.streakDays") : t("home.streakDaysPlural", { count: stats.streak })}
              </Text>
              <Text style={[styles.streakLabel, { color: c.textMuted }]}>
                {isRestToday
                  ? t("home.restDay")
                  : isReviewToday
                    ? t("home.reviewDay")
                    : stats.streak > 0
                      ? t("home.streakKeepGoing")
                      : t("home.streakStart")}
              </Text>
            </View>
            <Badge text={t("home.best", { count: stats.bestStreak })} tone="accent" emoji="🏅" />
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
                {stats.missed > 0 ? <MiniStat label={t("stats.missedDays")} value={`${stats.missed}`} /> : null}
              </View>
            </View>
          </View>
        </Card>

        {/* Ritual cue */}
        <Card style={styles.ritualCard}>
          <AnimatedEmoji size={26}>{ritual.emoji}</AnimatedEmoji>
          <View style={{ flex: 1 }}>
            <Text style={[styles.ritualTitle, { color: c.text }]}>{t("home.ritual")}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12.5 }}>
              {lang === "ar" ? ritual.ar : ritual.en} · {t("home.ritualHint")}
            </Text>
          </View>
        </Card>

        {/* Shelf progress + plan */}
        {primary ? (
          <>
            <SectionTitle>{t("home.shelfProgress")}</SectionTitle>
            <Card>
              <View style={styles.bookRow}>
                <View style={[styles.bookSpine, { backgroundColor: primary.cover_color ?? c.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.bookTitle, { color: c.text }]} numberOfLines={1}>
                    {primary.title}
                  </Text>
                  <Text style={[styles.bookAuthor, { color: c.textMuted }]} numberOfLines={1}>
                    {primary.author ?? t("common.unknownAuthor")}
                  </Text>
                  <View style={styles.progressRow}>
                    <ProgressBar value={shelfPct} color={primary.cover_color ?? c.primary} />
                  </View>
                  <View style={styles.bookMetaRow}>
                    <Text style={{ color: c.textFaint, fontSize: 11.5 }}>
                      {t("home.pagesLeft", { count: pagesLeft })}
                    </Text>
                    {plan.calendarDaysLeft > 0 ? (
                      <Text style={{ color: c.textFaint, fontSize: 11.5 }}>
                        {t("home.daysLeft", { count: plan.calendarDaysLeft })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
            </Card>

            <View style={{ marginTop: 14 }}>
              <PlanBar
                daysLeft={plan.readingDaysNeeded}
                percentLeft={plan.percentLeft}
                dailyPagesGoal={dailyPagesGoal}
                finishDate={plan.finishDate}
                pagesLeft={plan.pagesLeft}
                startDate={stats.startDate}
              />
            </View>
          </>
        ) : (
          <Card style={{ marginTop: 4 }}>
            <Text style={[styles.emptyText, { color: c.textMuted }]}>{t("home.noBook")}</Text>
          </Card>
        )}

        <DailyTakeawayCard />

        {/* Daily quote */}
        <View style={{ marginTop: 22 }}>
          <SectionTitle
            right={
              <Pressable onPress={() => setQuoteOffset((o) => o + 1)} accessibilityRole="button">
                <Text style={{ color: c.primary, fontSize: 12.5, fontWeight: "700" }}>{t("home.shuffleQuote")}</Text>
              </Pressable>
            }
          >
            {t("home.dailyQuote")}
          </SectionTitle>
          <Card style={{ borderLeftWidth: 3, borderLeftColor: c.accent }}>
            <Text style={[styles.quoteText, { color: c.text }]}>“{quote.text}”</Text>
            <Text style={{ color: c.textFaint, fontSize: 12, marginTop: 8 }}>— {quote.source}</Text>
          </Card>
        </View>

        {/* Badges */}
        <View style={{ marginTop: 22 }}>
          <SectionTitle right={<Text style={{ color: c.textMuted, fontSize: 12 }}>{t("home.badgesUnlocked", { count: unlocked.length, total: BADGES.length })}</Text>}>
            {t("home.badges")}
          </SectionTitle>
          <Card>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgeRow}>
              {BADGES.map((b) => {
                const got = stats.streak >= b.days;
                const meta = badgeText(b, lang);
                return (
                  <View
                    key={b.id}
                    style={[
                      styles.badgeTile,
                      {
                        backgroundColor: got ? c.primarySoft : c.surfaceAlt,
                        borderColor: got ? c.primary : c.border,
                        opacity: got ? 1 : 0.55,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>{got ? b.icon : "🔒"}</Text>
                    <Text style={{ color: got ? c.primary : c.textMuted, fontSize: 11.5, fontWeight: "700", textAlign: "center" }}>
                      {meta.title}
                    </Text>
                    <Text style={{ color: c.textFaint, fontSize: 10 }}>{b.days}d</Text>
                  </View>
                );
              })}
            </ScrollView>
            {next ? (
              <View style={{ marginTop: 14 }}>
                <View style={styles.badgeProgressRow}>
                  <Text style={{ color: c.textMuted, fontSize: 12.5 }}>
                    {t("home.nextBadge", { days: next.days - stats.streak, title: badgeText(next, lang).title })}
                  </Text>
                  <Text style={{ color: c.primary, fontSize: 12, fontWeight: "700" }}>
                    {stats.streak}/{next.days}
                  </Text>
                </View>
                <View style={{ marginTop: 8 }}>
                  <ProgressBar
                    value={badgeProgress(stats.streak, next.days, unlocked.length ? BADGES[unlocked.length - 1].days : 0)}
                  />
                </View>
              </View>
            ) : (
              <Text style={{ color: c.success, fontSize: 12.5, marginTop: 12 }}>{t("home.allBadges")}</Text>
            )}
          </Card>
        </View>

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

        {/* Read next */}
        {futureBooks.length > 0 ? (
          <View style={{ marginTop: 22 }}>
            <SectionTitle>{t("home.readingList")}</SectionTitle>
            <Card>
              {futureBooks.slice(0, 5).map((b) => (
                <View key={b.id} style={styles.futureRow}>
                  <View style={[styles.futureDot, { backgroundColor: b.cover_color ?? c.accent }]} />
                  <Text style={{ color: c.text, fontSize: 14, flex: 1 }} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <Text style={{ color: c.textFaint, fontSize: 12 }} numberOfLines={1}>
                    {b.author ?? ""}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        ) : null}

        {/* Shelf summary */}
        <View style={{ marginTop: 22 }}>
          <SectionTitle>{t("home.yourShelf")}</SectionTitle>
          <View style={styles.shelfRow}>
            <StatTile label={t("home.books")} value={`${books.length}`} emoji="📚" />
            <StatTile label={t("home.finished")} value={`${stats.booksFinished}`} emoji="✅" tone="accent" />
            <StatTile label={t("home.sessions")} value={`${stats.totalSessions}`} emoji="⏱️" />
          </View>
        </View>
      </ScrollView>

      {/* Floating primary action */}
      <Pressable
        onPress={() => setLogOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: c.primary, bottom: insets.bottom + 92, opacity: pressed ? 0.9 : 1 },
          theme.shadowLg,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("home.logToday")}
      >
        <Text style={[styles.fabPlus, { color: c.onPrimary }]}>{loggedToday ? "✓" : "+"}</Text>
        <Text style={[styles.fabText, { color: c.onPrimary }]}>
          {loggedToday ? t("home.loggedToday") : t("home.logSession")}
        </Text>
      </Pressable>

      <LogSessionSheet visible={logOpen} onClose={() => setLogOpen(false)} />
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const c = useTheme().colors;
  return (
    <View>
      <Text style={{ color: c.text, fontSize: 16, fontWeight: "700" }}>{value}</Text>
      <Text style={{ color: c.textFaint, fontSize: 11.5 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  greeting: { fontSize: 13.5 },
  appName: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
  streakCard: { marginBottom: 14 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  streakValue: { fontSize: 19, fontWeight: "800" },
  streakLabel: { fontSize: 12.5, marginTop: 1 },
  goalCard: { marginBottom: 14 },
  goalRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  goalMeta: { flex: 1, gap: 4 },
  goalTitle: { fontSize: 18, fontWeight: "700" },
  goalSub: { fontSize: 13 },
  miniStats: { flexDirection: "row", gap: 18, marginTop: 10 },
  ritualCard: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20, paddingVertical: 14 },
  ritualTitle: { fontSize: 14.5, fontWeight: "700" },
  bookRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  bookSpine: { width: 8, height: 62, borderRadius: 4 },
  bookTitle: { fontSize: 16, fontWeight: "700" },
  bookAuthor: { fontSize: 12.5, marginTop: 2 },
  progressRow: { marginTop: 10 },
  bookMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  emptyText: { fontSize: 13.5, lineHeight: 20 },
  quoteText: { fontSize: 15, lineHeight: 23, fontStyle: "italic" },
  badgeRow: { gap: 10 },
  badgeProgressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  badgeTile: { width: 78, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 16, borderWidth: 1 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  legendCell: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: 11, marginHorizontal: 4 },
  futureRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  futureDot: { width: 8, height: 8, borderRadius: 4 },
  shelfRow: { flexDirection: "row", gap: 12 },
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
  fabPlus: { fontSize: 20, fontWeight: "700", marginTop: -2 },
  fabText: { fontSize: 15, fontWeight: "700" },
});
