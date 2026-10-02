"use client";

import { useMemo, useState } from "react";
import { Flame, Sparkles } from "lucide-react";
import { useData } from "@/store/data";
import { useI18n } from "@/i18n/provider";
import { PageHeader, Section, Stat, StatTile } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LogSessionDialog } from "@/components/log-session-dialog";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { BADGES, badgeProgress, computePlan, nextBadge, unlockedBadges } from "@/lib/reading";
import { DAILY_QUOTES } from "@/data/quotes";

/**
 * Home — the daily glance.
 *
 * Mobile-first hierarchy: greeting, one hero card (streak + today's goal), one
 * primary action, then compact blocks. Nothing below the fold is required to
 * understand today.
 */
export default function HomePage() {
  const { t, lang } = useI18n();
  const { stats, books, preferences, ready } = useData();
  const [logOpen, setLogOpen] = useState(false);
  const [quoteOffset, setQuoteOffset] = useState(0);

  const reading = useMemo(() => books.filter((b) => b.status === "reading"), [books]);
  const primary = reading[0];

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t("home.greetingMorning");
    if (h < 18) return t("home.greetingAfternoon");
    return t("home.greetingEvening");
  }, [t]);

  const goalPct =
    preferences.dailyGoalMinutes > 0
      ? Math.min(100, Math.round((stats.todayMinutes / preferences.dailyGoalMinutes) * 100))
      : 0;

  const loggedToday = stats.todayMinutes > 0;

  const plan = useMemo(
    () =>
      computePlan({
        totalPages: primary?.totalPages ?? 0,
        currentPage: primary?.currentPage ?? 0,
        dailyPagesGoal: preferences.dailyPagesGoal,
        offDays: [...preferences.restDays, ...preferences.reviewDays],
      }),
    [primary, preferences.dailyPagesGoal, preferences.restDays, preferences.reviewDays],
  );

  const unlocked = useMemo(() => unlockedBadges(stats.streak), [stats.streak]);
  const next = useMemo(() => nextBadge(stats.streak), [stats.streak]);

  const quote = useMemo(() => {
    const deck = DAILY_QUOTES[lang] ?? DAILY_QUOTES.en;
    const dayIndex = Math.floor(Date.now() / 86_400_000);
    return deck[(dayIndex + quoteOffset) % deck.length];
  }, [lang, quoteOffset]);

  const ritual = preferences.ritualDrink;

  if (!ready) {
    return (
      <div className="flex min-h-[60dvh] items-center justify-center text-sm text-muted-foreground">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("app.name")}
        subtitle={greeting}
        right={
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => setLogOpen(true)}>
            {t("home.logSession")}
          </Button>
        }
      />

      {/* Hero: streak + today's goal, the two numbers that matter. */}
      <Card className="overflow-hidden border-primary/20 bg-streak">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div
              className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/15 text-2xl ring-1 ring-primary/25"
              aria-hidden
            >
              {stats.streak > 0 ? "🔥" : "🌱"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-primary" aria-hidden />
                <span className="truncate text-xl font-bold tabular-nums">
                  {stats.streak === 1
                    ? t("home.streakDays", { count: 1 })
                    : t("home.streakDaysPlural", { count: stats.streak })}
                </span>
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {stats.streak > 0 ? t("home.streakKeepGoing") : t("home.streakStart")}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <span className="text-sm font-medium">{t("home.today")}</span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {t("home.ofMinutes", { count: preferences.dailyGoalMinutes })}
              </span>
            </div>
            <Progress value={goalPct} className="h-2.5" />
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat label={t("home.thisWeek")} value={`${stats.weekMinutes}m`} />
              <Stat label={t("home.allTime")} value={`${Math.round(stats.totalMinutes / 60)}h`} />
              <Stat label={t("home.best", { count: stats.bestStreak })} value={`${stats.bestStreak}`} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* The single primary action. */}
      <Button size="lg" className="mt-4 w-full shadow-lift" onClick={() => setLogOpen(true)}>
        {loggedToday ? `✓ ${t("home.loggedToday")}` : t("home.logSession")}
      </Button>

      {/* Current book + plan projection. */}
      <Section title={t("home.shelfProgress")} accent="teal">
        {primary ? (
          <Card className="surface-hover">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-14 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: primary.coverColor ?? "hsl(var(--teal))" }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{primary.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {primary.author ?? t("common.unknownAuthor")}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-teal-strong">
                  {Math.round(plan.percentDone * 100)}%
                </span>
              </div>
              <Progress value={plan.percentDone * 100} className="mt-3 h-2" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span>{t("home.pagesLeft", { count: plan.pagesLeft })}</span>
                {plan.calendarDaysLeft > 0 ? (
                  <span>{t("home.daysLeft", { count: plan.calendarDaysLeft })}</span>
                ) : null}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">{t("home.noBook")}</CardContent>
          </Card>
        )}
      </Section>

      {/* Ritual cue. */}
      <Section accent="violet">
        <Card className="border-violet/20 bg-mint">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-soft text-xl" aria-hidden>
              {ritualEmoji(ritual)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{t("home.ritual")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {ritualLabel(ritual, lang)} · {t("home.ritualHint")}
              </p>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Activity. */}
      <Section
        title={t("home.activity")}
        accent="teal"
        action={<span className="text-xs text-muted-foreground">{t("home.last30")}</span>}
      >
        <Card>
          <CardContent className="p-4">
            <ActivityHeatmap days={stats.last30} />
          </CardContent>
        </Card>
      </Section>

      {/* Badges + quote, kept below the fold. */}
      <Section
        title={t("home.badges")}
        accent="rose"
        action={
          <span className="text-xs text-muted-foreground">
            {t("home.badgesUnlocked", { count: unlocked.length, total: BADGES.length })}
          </span>
        }
      >
        <Card>
          <CardContent className="p-4">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {BADGES.map((b) => {
                const got = stats.streak >= b.days;
                const meta = lang === "ar" ? b.ar : b.en;
                return (
                  <div
                    key={b.id}
                    className={
                      "flex w-[4.5rem] shrink-0 flex-col items-center gap-1 rounded-xl border p-2 text-center transition-colors " +
                      (got ? "border-rose/30 bg-rose-soft" : "border-border bg-muted/40 opacity-55")
                    }
                  >
                    <span className="text-lg" aria-hidden>
                      {got ? b.icon : "🔒"}
                    </span>
                    <span
                      className={
                        "text-[11px] font-medium leading-tight " + (got ? "text-rose-strong" : "")
                      }
                    >
                      {meta.title}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{b.days}d</span>
                  </div>
                );
              })}
            </div>
            {next ? (
              <div className="mt-3">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>
                    {t("home.nextBadge", {
                      days: next.days - stats.streak,
                      title: lang === "ar" ? next.ar.title : next.en.title,
                    })}
                  </span>
                  <span className="tabular-nums">
                    {stats.streak}/{next.days}
                  </span>
                </div>
                <Progress
                  value={
                    badgeProgress(
                      stats.streak,
                      next.days,
                      unlocked.length ? BADGES[unlocked.length - 1].days : 0,
                    ) * 100
                  }
                  className="h-1.5"
                />
              </div>
            ) : (
              <p className="mt-3 text-xs font-medium text-success">{t("home.allBadges")}</p>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section
        title={t("home.dailyQuote")}
        accent="amber"
        action={
          <button
            type="button"
            onClick={() => setQuoteOffset((o) => o + 1)}
            className="text-xs font-medium text-primary hover:underline"
          >
            {t("home.shuffleQuote")}
          </button>
        }
      >
        <Card className="border-l-4 border-l-primary bg-hero">
          <CardContent className="p-4">
            <p className="text-sm italic leading-relaxed">“{quote.text}”</p>
            <p className="mt-2 text-xs text-muted-foreground">— {quote.source}</p>
          </CardContent>
        </Card>
      </Section>

      {/* Shelf numbers, each with its own accent. */}
      <Section title={t("home.yourShelf")} accent="indigo">
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon="📚" label={t("home.books")} value={`${books.length}`} accent="amber" />
          <StatTile icon="✅" label={t("home.finished")} value={`${stats.booksFinished}`} accent="teal" />
          <StatTile icon="⏱️" label={t("home.sessions")} value={`${stats.totalSessions}`} accent="violet" />
        </div>
      </Section>

      <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        {t("app.footer")}
      </p>

      <LogSessionDialog open={logOpen} onOpenChange={setLogOpen} />
    </div>
  );
}

function ritualEmoji(id: string): string {
  const map: Record<string, string> = { laban: "🥛", yansoon: "🍵", shay: "☕", water: "💧", none: "🫖" };
  return map[id] ?? "🫖";
}

function ritualLabel(id: string, lang: "en" | "ar"): string {
  const map: Record<string, { en: string; ar: string }> = {
    laban: { en: "Warm milk", ar: "لبن دافي" },
    yansoon: { en: "Anise tea", ar: "ينسون" },
    shay: { en: "Light tea with milk", ar: "شاي بلبن خفيف" },
    water: { en: "Water", ar: "مياه" },
    none: { en: "Nothing", ar: "من غير حاجة" },
  };
  return map[id]?.[lang] ?? id;
}
