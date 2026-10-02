import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Text, TextInput } from "./Text";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { useSettings } from "../store/settings";
import { useI18n } from "../i18n";
import { Button, Card, SectionTitle } from "./ui";
import { useToast } from "./motion/Toast";
import { useConfetti } from "./motion/Confetti";
import { toDayKey } from "../domain/achievements";

/**
 * The daily reflection box.
 *
 * One short summary per day — what those pages were about — attached to the book
 * being read. Writing them daily is what builds the book's "essence": the running
 * collection of takeaways shown on the book's page.
 */
export function DailyTakeawayCard() {
  const c = useTheme().colors;
  const { books, dailyEntries, saveDailyEntry } = useData();
  const { dailyPagesGoal } = useSettings();
  const { t } = useI18n();
  const toast = useToast();
  const confetti = useConfetti();

  const today = toDayKey(new Date());
  const existing = useMemo(
    () => dailyEntries.find((e) => e.entry_date === today),
    [dailyEntries, today],
  );

  const reading = useMemo(() => books.filter((b) => b.status === "reading"), [books]);
  const [text, setText] = useState(existing?.summary ?? "");
  const [saving, setSaving] = useState(false);

  // Reload the box whenever the day's saved entry changes (sync, book switch).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setText(existing?.summary ?? "");
  }, [existing?.summary, today]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const book = useMemo(
    () => books.find((b) => b.id === existing?.book_id) ?? reading[0] ?? null,
    [books, existing?.book_id, reading],
  );

  const save = async () => {
    const summary = text.trim();
    if (!summary || saving) return;
    setSaving(true);
    const from = book?.current_page ?? null;
    await saveDailyEntry({
      entry_date: today,
      book_id: book?.id ?? null,
      pages_from: from,
      pages_to: from != null ? from + dailyPagesGoal : null,
      summary,
      essence: book ? t("daily.essenceOf", { title: book.title }) : null,
    });
    setSaving(false);
    confetti.burst({ emojis: ["✍️", "📖", "✨"], count: 12 });
    toast.show(t("daily.saved"), { emoji: "📝", tone: "success" });
  };

  const hasEntry = Boolean(existing?.summary);

  return (
    <View style={{ marginTop: 22 }}>
      <SectionTitle
        right={
          <Text style={{ color: hasEntry ? c.success : c.textMuted, fontSize: 12 }}>
            {hasEntry ? t("daily.doneToday") : t("daily.pendingToday")}
          </Text>
        }
      >
        {t("daily.title")}
      </SectionTitle>
      <Card>
        <Text style={{ color: c.textMuted, fontSize: 12.5, marginBottom: 10 }}>
          {book
            ? t("daily.hint", { pages: dailyPagesGoal, title: book.title })
            : t("daily.hintNoBook", { pages: dailyPagesGoal })}
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("daily.placeholder")}
          placeholderTextColor={c.textFaint}
          multiline
          style={[
            styles.input,
            { color: c.text, borderColor: c.border, backgroundColor: c.surfaceAlt },
          ]}
        />
        <Button
          label={hasEntry ? t("daily.update") : t("daily.save")}
          onPress={save}
          loading={saving}
          disabled={!text.trim()}
          style={{ marginTop: 12 }}
        />
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
    minHeight: 84,
    textAlignVertical: "top",
    lineHeight: 21,
  },
});
