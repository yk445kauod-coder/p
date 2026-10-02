"use client";

import { useMemo, useState } from "react";
import { useData } from "@/store/data";
import { useI18n } from "@/i18n/provider";
import { PageHeader, Section, StatTile } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { BADGES, daysSince, toDayKey } from "@/lib/reading";
import { formatDay, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { TranslationKey } from "@/i18n";

type Range = "week" | "fortnight" | "month" | "twomonth" | "year";

const RANGES: { key: Range; days: number; labelKey: TranslationKey }[] = [
  { key: "week", days: 7, labelKey: "stats.week" },
  { key: "fortnight", days: 15, labelKey: "stats.fortnight" },
  { key: "month", days: 30, labelKey: "stats.month" },
  { key: "twomonth", days: 60, labelKey: "stats.twomonth" },
  { key: "year", days: 365, labelKey: "stats.year" },
];

/** Stats — one chart system, one calendar, badges shown once. */
export default function StatsPage() {
  const { t, lang } = useI18n();
  const { stats, sessions, books } = useData();
  const [range, setRange] = useState<Range>("month");

  const days = RANGES.find((r) => r.key === range)?.days ?? 30;

  // Bucket sessions by day for the selected range.
  const series = useMemo(() => {
    const byDay = new Map<string, { minutes: number; pages: number }>();
    for (const s of sessions) {
      const cur = byDay.get(s.day) ?? { minutes: 0, pages: 0 };
      cur.minutes += s.minutes;
      cur.pages += s.pagesRead;
      byDay.set(s.day, cur);
    }
    const out: { date: string; minutes: number; pages: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const k = toDayKey(d);
      out.push({ date: k, ...(byDay.get(k) ?? { minutes: 0, pages: 0 }) });
    }
    return out;
  }, [days, sessions]);

  const maxMinutes = Math.max(1, ...series.map((d) => d.minutes));
  const rangeMinutes = series.reduce((a, d) => a + d.minutes, 0);
  const activeDays = series.filter((d) => d.minutes > 0).length;
  const avgPerActive = activeDays ? Math.round(rangeMinutes / activeDays) : 0;

  const byBook = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of sessions) {
      if (!s.bookId) continue;
      map.set(s.bookId, (map.get(s.bookId) ?? 0) + s.minutes);
    }
    return Array.from(map.entries())
      .map(([id, minutes]) => ({ book: books.find((b) => b.id === id), minutes }))
      .filter((x) => x.book)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
  }, [sessions, books]);

  const maxBook = Math.max(1, ...byBook.map((b) => b.minutes));

  return (
    <div>
      <PageHeader title={t("stats.title")} subtitle={t("stats.subtitle")} accent="teal" />

      {/* Range picker: thumb-sized segmented control. */}
      <div className="inline-flex rounded-lg border border-border p-1">
        {RANGES.map((r) => (
          <button
            key={r.key}
            type="button"
            onClick={() => setRange(r.key)}
            aria-pressed={range === r.key}
            className={cn(
              "min-h-9 rounded-md px-3 text-sm font-medium transition-colors",
              range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground",
            )}
          >
            {t(r.labelKey)}
          </button>
        ))}
      </div>

      {/* KPI grid: two columns on phones, each with its own accent. */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <StatTile icon="🔥" label={t("stats.currentStreak")} value={t("stats.daysShort", { count: stats.streak })} accent="amber" />
        <StatTile icon="🏆" label={t("stats.bestStreak")} value={t("stats.daysShort", { count: stats.bestStreak })} accent="rose" />
        <StatTile icon="📖" label={t("stats.activeDays")} value={`${activeDays}`} accent="teal" />
        <StatTile icon="💤" label={t("stats.missedDays")} value={`${stats.missed}`} accent="violet" />
      </div>

      {stats.startDate ? (
        <Card className="mt-3 border-teal/20 bg-mint">
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <p className="text-sm font-medium">{t("stats.journeyStart")}</p>
              <p className="truncate text-xs text-muted-foreground">
                {t("stats.journeyStartValue", { date: formatDay(stats.startDate, lang) })}
              </p>
            </div>
            <Badge variant="teal" className="shrink-0">
              {t("stats.journeyDays", { count: daysSince(stats.startDate) })}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      {/* Minutes per day: a compact bar row, no chart library needed. */}
      <Section
        title={t("stats.range")}
        accent="amber"
        action={<span className="text-xs tabular-nums text-muted-foreground">{rangeMinutes} min</span>}
      >
        <Card>
          <CardContent className="p-4">
            <div className="flex h-24 items-end gap-[3px]">
              {series.map((d) => (
                <div
                  key={d.date}
                  title={`${d.date} · ${d.minutes}m`}
                  className={cn(
                    "flex-1 rounded-sm transition-colors",
                    d.minutes > 0 ? "bg-primary" : "bg-muted",
                  )}
                  style={{ height: `${Math.max(3, (d.minutes / maxMinutes) * 100)}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
              <span>{series[0]?.date.slice(5)}</span>
              <span>{series[series.length - 1]?.date.slice(5)}</span>
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title={t("stats.consistency")} accent="teal">
        <Card>
          <CardContent className="p-4">
            <ActivityHeatmap days={stats.last30} />
          </CardContent>
        </Card>
      </Section>

      <Section title={t("stats.whereTime")} accent="violet">
        <Card>
          <CardContent className="p-4">
            {byBook.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("stats.noBreakdown")}</p>
            ) : (
              <div className="grid gap-3">
                {byBook.map(({ book, minutes }) => (
                  <div key={book!.id} className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: book!.coverColor ?? "hsl(var(--violet))" }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">{book!.title}</span>
                    <div className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-violet"
                        style={{ width: `${(minutes / maxBook) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                      {minutes}m
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </Section>

      <Section title={t("stats.milestones")} accent="rose">
        <Card>
          <CardContent className="p-4">
            <p className="mb-3 text-xs text-muted-foreground">{t("stats.milestonesHint")}</p>
            <div className="grid gap-3">
              {BADGES.map((b) => {
                const got = stats.streak >= b.days;
                const meta = lang === "ar" ? b.ar : b.en;
                return (
                  <div key={b.id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid h-9 w-9 shrink-0 place-items-center rounded-xl text-base",
                        got ? "bg-rose-soft" : "bg-muted",
                      )}
                      aria-hidden
                    >
                      {got ? b.icon : "🔒"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{meta.title}</p>
                      <p className="truncate text-xs text-muted-foreground">{meta.desc}</p>
                    </div>
                    <Badge variant={got ? "rose" : "outline"} className="shrink-0">
                      {got ? t("stats.unlocked") : t("stats.inDays", { count: b.days - stats.streak })}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </Section>

      <Section title={t("stats.averages")} accent="indigo">
        <Card>
          <CardContent className="divide-y divide-border p-4">
            {[
              { label: t("stats.sessionsLogged"), value: `${stats.totalSessions}` },
              { label: t("stats.avgSession"), value: `${avgPerActive} min` },
              { label: t("stats.thisWeek"), value: `${stats.weekMinutes} min` },
              { label: t("stats.booksFinished"), value: `${stats.booksFinished}` },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                <span className="text-sm text-muted-foreground">{row.label}</span>
                <span className="text-sm font-semibold tabular-nums">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
