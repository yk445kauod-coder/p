import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "./Text";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { useI18n } from "../i18n";

/**
 * The book's "essence": every daily summary written while reading it, in order.
 *
 * This is the payoff for writing a line each day — by the last page the reader
 * has a page-by-page account of what the book actually taught them.
 */
export function BookEssence({ bookId }: { bookId: string }) {
  const c = useTheme().colors;
  const { dailyEntries } = useData();
  const { t, lang } = useI18n();

  const entries = useMemo(
    () =>
      dailyEntries
        .filter((e) => e.book_id === bookId && e.summary.trim())
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date)),
    [dailyEntries, bookId],
  );

  if (entries.length === 0) {
    return <Text style={{ color: c.textFaint, fontSize: 13 }}>{t("book.essenceEmpty")}</Text>;
  }

  const fmt = (key: string) =>
    new Date(`${key}T00:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    });

  return (
    <View style={styles.wrap}>
      {entries.map((e, i) => (
        <View key={e.id} style={styles.row}>
          {/* Timeline rail: a dot per entry with a connector down to the next. */}
          <View style={styles.rail}>
            <View style={[styles.dot, { backgroundColor: c.primary }]} />
            {i < entries.length - 1 ? <View style={[styles.line, { backgroundColor: c.border }]} /> : null}
          </View>
          <View style={styles.body}>
            <View style={styles.head}>
              <Text style={[styles.date, { color: c.primary }]}>{fmt(e.entry_date)}</Text>
              {e.pages_from != null && e.pages_to != null ? (
                <Text style={[styles.pages, { color: c.textFaint }]}>
                  {t("book.essencePages", { from: e.pages_from, to: e.pages_to })}
                </Text>
              ) : null}
            </View>
            <Text style={[styles.summary, { color: c.text }]}>{e.summary}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  row: { flexDirection: "row", gap: 12 },
  rail: { alignItems: "center", width: 12 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  line: { flex: 1, width: 2, marginVertical: 2 },
  body: { flex: 1, paddingBottom: 16 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  date: { fontSize: 12.5, fontWeight: "700" },
  pages: { fontSize: 11.5 },
  summary: { fontSize: 14, lineHeight: 20, marginTop: 3 },
});
