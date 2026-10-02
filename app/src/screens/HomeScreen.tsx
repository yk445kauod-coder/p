import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text } from "../components/Text";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { useSettings, RITUAL_DRINKS } from "../store/settings";
import { useI18n } from "../i18n";
import { Card, ProgressBar, SectionTitle, Badge, StatTile, Button } from "../components/ui";
import { RingProgress } from "../components/RingProgress";
import { Heatmap } from "../components/Heatmap";
import { Logo } from "../components/Logo";
import { GradientMesh } from "../components/visuals";
import { LogSessionSheet } from "../components/LogSessionSheet";
import { AnimatedEmoji } from "../components/motion/AnimatedEmoji";
import { PlanBar } from "../components/PlanBar";
import { DailyTakeawayCard } from "../components/DailyTakeawayCard";
import { Screen, Section, InteractiveRow, useResponsive } from "../components/layout";
import { badgeText, nextBadge, unlockedBadges, BADGES } from "../domain/achievements";
import { computePlan, badgeProgress } from "../domain/plan";
import { dailyQuote } from "../domain/quotes";

/**
 * Home - a hero (greeting, streak, today's goal) then a short, grouped body.
 *
 * The old screen was ~11 stacked cards; highlights (quote + badges) now sit
 * behind one "see all" toggle so the first screenful stays focused on today.
 */
export function HomeScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const { stats, books, futureBooks } = useData();
  const { dailyGoalMinutes, ritualDrink, restDays, reviewDays, dailyPagesGoal, shelfGoalPages } = useSettings();
  const { t, lang } = useI18n();
  const { compact } = useResponsive();
  const [logOpen, setLogOpen] = useState(false);
  const [quoteOffset, setQuoteOffset] = useState(0);
  const [showHighlights, setShowHighlights] = useState(false);

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
  const ritual = RITUAL_DRINKS.find((d) => d.id === ritualDrink) ?? RITUAL_DRINKS[0];

  const statusLine = isRestToday
    ? t("home.restDay")
    : isReviewToday
      ? t("home.reviewDay")
      : stats.streak > 0
        ? t("home.streakKeepGoing")
        : t("home.streakStart");

  return (
    <View style={{ flex: 1 }}>
      <GradientMesh />
      <Screen>
        {/* Hero: greeting + identity + streak, in one bold block. */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greeting, { color: c.textMuted }]}>{greeting}</Text>
            <Text style={[styles.appName, { color: c.text }]}>{t("home.heroTitle")}</Text>
          </View>
          <Logo size={44} animated />
        </View>

        <Card elevated style={styles.hero}>
          <View style={styles.heroRow}>
            <RingProgress
              value={goalPct}
              label={`${stats.todayMinutes}`}
              sublabel={t("home.ofMinutes", { count: dailyGoalMinutes })}
            />
            <View style={styles.heroMeta}>
              <View style={styles.streakLine}>
                <AnimatedEmoji size={24} trigger={stats.streak} loop={stats.streak > 0}>
                  {stats.streak > 0 ? "🔥" : "🌱"}
                </AnimatedEmoji>
                <Text style={[styles.streakValue, { color: c.text }]}>
                  {stats.streak === 1 ? t("home.streakDays") : t("home.streakDaysPlural", { count: stats.streak })}
                </Text>
              </View>
              <Text style={[styles.heroSub, { color: c.textMuted }]}>{statusLine}</Text>
              <View style={styles.miniStats}>
                <MiniStat label={t("home.thisWeek")} value={`${stats.weekMinutes}m`} />
                <MiniStat label={t("home.allTime")} value={`${Math.round(stats.totalMinutes / 60)}h`} />
                <MiniStat label={t("stats.bestStreak")} value={`${stats.bestStreak}`} />
              </View>
            </View>
          </View>
        </Card>

        {/* The one action that matters today. */}
        <Button
          label={loggedToday ? t("home.loggedToday") : t("home.logSession")}
          variant="gradient"
          size="lg"
          fullWidth
          icon={<Text style={{ fontSize: 18 }}>{loggedToday ? "✅" : "＋"}</Text>}
          onPress={() => setLogOpen(true)}
          style={{ marginTop: 14 }}
        />

        {/* Ritual cue - a small, warm nudge. */}
        <Card style={styles.ritualCard}>
          <AnimatedEmoji size={24}>{ritual.emoji}</AnimatedEmoji>
          <View style={{ flex: 1 }}>
            <Text style={[styles.ritualTitle, { color: c.text }]}>{t("home.ritual")}</Text>
            <Text style={{ color: c.textMuted, fontSize: 12.5 }}>
              {lang === "ar" ? ritual.ar : ritual.en} · {t("home.ritualHint")}
            </Text>
          </View>
        </Card>

        {/* Current book + plan. */}
        {primary ? (
          <Section>
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
                      {t("home.pagesLeft", { count: plan.pagesLeft })}
                    </Text>
                    {plan.calendarDaysLeft > 0 ? (
                      <Text style={{ color: c.textFaint, fontSize: 11.5 }}>
                        {t("home.daysLeft", { count: plan.calendarDaysLeft })}
                      </Text>
                    ) : null}
                  </View>
                </View>
              </View>
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
            </Card>
          </Section>
        ) : (
          <Section>
            <Card style={{ alignItems: "center", gap: 10, paddingVertical: 24 }}>
              <Text style={{ fontSize: 30 }}>📚</Text>
              <Text style={{ color: c.textMuted, fontSize: 13.5, lineHeight: 20, textAlign: "center" }}>
                {t("home.noBook")}
              </Text>
            </Card>
          </Section>
        )}

        <Section>
          <DailyTakeawayCard />
        </Section>

        {/* Highlights: quote + badges behind one toggle keeps Home short. */}
        <Section>
          <InteractiveRow
            onPress={() => setShowHighlights((v) => !v)}
            style={[styles.highlightToggle, { borderColor: c.border, backgroundColor: c.surface }]}
            accessibilityLabel={t("home.highlights")}
          >
            <Text style={{ fontSize: 18 }}>✨</Text>
            <Text style={{ flex: 1, color: c.text, fontSize: 15, fontWeight: "800" }}>{t("home.highlights")}</Text>
            <Badge text={`${unlocked.length}/${BADGES.length}`} tone="accent" emoji="🏅" />
            <Text style={{ color: c.textMuted, fontSize: 13 }}>{showHighlights ? "▲" : "▼"}</Text>
          </InteractiveRow>

          {showHighlights ? (
            <View style={{ marginTop: 14, gap: 18 }}>
              <View>
                <SectionTitle
                  right={
                    <Pressable onPress={() => setQuoteOffset((o) => o + 1)} accessibilityRole="button">
                      <Text style={{ color: c.primary, fontSize: 12.5, fontWeight: "800" }}>{t("home.shuffleQuote")}</Text>
                    </Pressable>
                  }
                >
                  {t("home.dailyQuote")}
                </SectionTitle>
                <Card style={{ borderLeftWidth: 4, borderLeftColor: c.accent }}>
                  <Text style={[styles.quoteText, { color: c.text }]}>“{quote.text}”</Text>
                  <Text style={{ color: c.textFaint, fontSize: 12, marginTop: 8 }}>— {quote.source}</Text>
                </Card>
              </View>

              <View>
                <SectionTitle
                  right={
                    <Text style={{ color: c.textMuted, fontSize: 12 }}>
                      {t("home.badgesUnlocked", { count: unlocked.length, total: BADGES.length })}
                    </Text>
                  }
                >
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
                          <Text style={{ color: got ? c.primary : c.textMuted, fontSize: 11.5, fontWeight: "800", textAlign: "center" }}>
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
                        <Text style={{ color: c.primary, fontSize: 12, fontWeight: "800" }}>
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
            </View>
          ) : null}
        </Section>

        {/* Activity. */}
        <Section>
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
        </Section>

        <Section>
          <SectionTitle>{t("home.yourShelf")}</SectionTitle>
          <View style={[styles.shelfRow, compact && { flexWrap: "wrap" }]}>
            <StatTile label={t("home.books")} value={`${books.length}`} emoji="📚" />
            <StatTile label={t("home.finished")} value={`${stats.booksFinished}`} emoji="✅" tone="accent" />
            <StatTile label={t("home.sessions")} value={`${stats.totalSessions}`} emoji="⏱️" />
          </View>
        </Section>

        {futureBooks.length > 0 ? (
          <Section>
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
          </Section>
        ) : null}
      </Screen>

      <LogSessionSheet visible={logOpen} onClose={() => setLogOpen(false)} />
    </View>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const c = useTheme().colors;
  return (
    <View>
      <Text style={{ color: c.text, fontSize: 16, fontWeight: "800" }}>{value}</Text>
      <Text style={{ color: c.textFaint, fontSize: 11.5 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  greeting: { fontSize: 13.5 },
  appName: { fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  hero: { gap: 14 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 18 },
  heroMeta: { flex: 1, gap: 4 },
  streakLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  streakValue: { fontSize: 21, fontWeight: "900", letterSpacing: -0.4 },
  heroSub: { fontSize: 13 },
  miniStats: { flexDirection: "row", gap: 18, marginTop: 10 },
  ritualCard: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, paddingVertical: 14 },
  ritualTitle: { fontSize: 14.5, fontWeight: "800" },
  bookRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  bookSpine: { width: 8, height: 62, borderRadius: 4 },
  bookTitle: { fontSize: 16, fontWeight: "800" },
  bookAuthor: { fontSize: 12.5, marginTop: 2 },
  progressRow: { marginTop: 10 },
  bookMetaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  highlightToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  quoteText: { fontSize: 15, lineHeight: 23, fontStyle: "italic" },
  badgeRow: { gap: 10 },
  badgeProgressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  badgeTile: { width: 78, alignItems: "center", gap: 4, paddingVertical: 12, borderRadius: 16, borderWidth: 1.5 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  legendCell: { width: 14, height: 14, borderRadius: 4 },
  legendText: { fontSize: 11, marginHorizontal: 4 },
  futureRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  futureDot: { width: 8, height: 8, borderRadius: 4 },
  shelfRow: { flexDirection: "row", gap: 12 },
});
