import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { useTheme } from "../theme/ThemeProvider";
import { useI18n } from "../i18n";
import { Card } from "./ui";

/**
 * The at-a-glance answer to "where am I and how much is left".
 *
 * Shows days remaining, the share of the book still unread, the pages-per-day
 * pace the reader set, and the projected finish date — all derived from the
 * schedule (rest and review days included), not from a naive pages/minutes guess.
 */
export function PlanBar({
  daysLeft,
  percentLeft,
  dailyPagesGoal,
  finishDate,
  pagesLeft,
  startDate,
}: {
  daysLeft: number;
  percentLeft: number;
  dailyPagesGoal: number;
  finishDate: string | null;
  pagesLeft: number;
  startDate: string | null;
}) {
  const c = useTheme().colors;
  const { t, lang } = useI18n();

  const done = pagesLeft === 0;
  const pctLeft = Math.round(percentLeft * 100);
  const pctDone = 100 - pctLeft;

  const fmtDate = (key: string) => {
    const d = new Date(`${key}T00:00:00Z`);
    return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  };

  return (
    <Card>
      <View style={styles.head}>
        <Text style={[styles.title, { color: c.text }]}>{t("home.plan")}</Text>
        {startDate ? (
          <Text style={[styles.start, { color: c.textFaint }]}>
            {t("home.journeyStart", { date: fmtDate(startDate) })}
          </Text>
        ) : null}
      </View>

      {done ? (
        <Text style={[styles.doneText, { color: c.success }]}>{t("home.planDone")}</Text>
      ) : (
        <>
          <View style={styles.statRow}>
            <PlanStat value={`${daysLeft}`} label={t("home.planDaysLeftShort")} tone={c.primary} />
            <PlanStat value={`${pctLeft}%`} label={t("home.planPercentLeftShort")} tone={c.accent} />
            <PlanStat value={`${dailyPagesGoal}`} label={t("home.planPerDayShort")} tone={c.text} />
          </View>

          <View style={[styles.track, { backgroundColor: c.surfaceAlt }]}>
            <View style={[styles.fill, { width: `${pctDone}%`, backgroundColor: c.primary }]} />
          </View>
          <Text style={[styles.caption, { color: c.textMuted }]}>
            {t("home.planProgress", { done: pctDone, left: pctLeft })}
          </Text>

          {finishDate ? (
            <Text style={[styles.finish, { color: c.textMuted }]}>
              {t("home.planFinish", { date: fmtDate(finishDate) })}
            </Text>
          ) : null}
        </>
      )}
    </Card>
  );
}

function PlanStat({ value, label, tone }: { value: string; label: string; tone: string }) {
  const c = useTheme().colors;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 },
  title: { fontSize: 17, fontWeight: "700" },
  start: { fontSize: 11.5 },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  stat: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  track: { height: 10, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 999 },
  caption: { fontSize: 12.5, marginTop: 8 },
  finish: { fontSize: 12.5, marginTop: 6, fontWeight: "600" },
  doneText: { fontSize: 14.5, fontWeight: "700" },
});
