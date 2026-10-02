import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../Text";
import { Card, SectionTitle, SegmentedControl } from "../ui";
import { useTheme } from "../../theme/ThemeProvider";
import { useData } from "../../store/data";
import { useI18n } from "../../i18n";
import { ReadingStreakCalendar } from "./ReadingStreakCalendar";
import { GenreDistributionChart } from "./GenreDistributionChart";
import { MonthlyProgressChart } from "./MonthlyProgressChart";
import { ChartEmpty } from "./ChartEmpty";
import { deriveCalendar, deriveGenres, deriveMonthly, totalPages, activeDays } from "./derive";
import type { MonthlyMetric } from "./types";

/**
 * The analytics block on the Insights screen.
 *
 * Everything is derived from `useData()`, which is already scoped to the signed
 * in reader (or the guest's local store), so no chart can leak another user's
 * numbers and no mock data is involved.
 */
export function AnalyticsSection() {
  const c = useTheme().colors;
  const { sessions, books } = useData();
  const { t } = useI18n();
  const [metric, setMetric] = useState<MonthlyMetric>("pages");

  const calendar = useMemo(() => deriveCalendar(sessions), [sessions]);
  const genres = useMemo(
    () => deriveGenres(sessions, books, t("analytics.uncategorised")),
    [sessions, books, t],
  );
  const monthly = useMemo(() => deriveMonthly(sessions, books), [sessions, books]);

  const hasSessions = sessions.length > 0;
  const pagesThisYear = totalPages(calendar);
  const yearActiveDays = activeDays(calendar);

  return (
    <View>
      <Text style={[styles.heading, { color: c.text }]}>{t("analytics.title")}</Text>
      <Text style={[styles.subheading, { color: c.textMuted }]}>{t("analytics.subtitle")}</Text>

      <Card style={styles.card}>
        <SectionTitle
          right={
            hasSessions ? (
              <Text style={{ color: c.textMuted, fontSize: 12 }}>
                {t("analytics.totalPages", { count: pagesThisYear.toLocaleString() })}
              </Text>
            ) : undefined
          }
        >
          {t("analytics.streak")}
        </SectionTitle>
        <Text style={[styles.hint, { color: c.textMuted }]}>{t("analytics.streakHint")}</Text>
        {hasSessions ? (
          <>
            <ReadingStreakCalendar data={calendar} days={365} />
            <Text style={[styles.caption, { color: c.textFaint }]}>
              {t("analytics.activeDays", { count: yearActiveDays })}
            </Text>
          </>
        ) : (
          <ChartEmpty icon="🗓️" />
        )}
      </Card>

      <Card style={styles.card}>
        <SectionTitle>{t("analytics.genres")}</SectionTitle>
        <Text style={[styles.hint, { color: c.textMuted }]}>{t("analytics.genresHint")}</Text>
        {genres.length > 0 ? <GenreDistributionChart data={genres} /> : <ChartEmpty icon="🍩" />}
      </Card>

      <Card style={styles.card}>
        <SectionTitle>{t("analytics.monthly")}</SectionTitle>
        <Text style={[styles.hint, { color: c.textMuted }]}>{t("analytics.monthlyHint")}</Text>
        <SegmentedControl
          style={{ marginBottom: 14 }}
          value={metric}
          onChange={setMetric}
          options={[
            { value: "pages", label: t("analytics.pagesMetric") },
            { value: "books", label: t("analytics.booksMetric") },
          ]}
        />
        {hasSessions ? <MonthlyProgressChart data={monthly} metric={metric} /> : <ChartEmpty icon="📈" />}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 20, fontWeight: "800", letterSpacing: -0.4, marginTop: 8 },
  subheading: { fontSize: 12.5, marginTop: 3, marginBottom: 4, lineHeight: 18 },
  card: { marginTop: 16 },
  hint: { fontSize: 12.5, marginBottom: 12, lineHeight: 18 },
  caption: { fontSize: 11.5, marginTop: 10, textAlign: "center" },
});
