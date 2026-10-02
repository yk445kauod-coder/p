import React, { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "./Text";
import * as Haptics from "expo-haptics";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { useI18n } from "../i18n";
import { Button, SegmentedControl } from "./ui";
import { SheetFrame } from "./SheetFrame";
import { useConfetti } from "./motion/Confetti";
import { useToast } from "./motion/Toast";
import { AnimatedEmoji } from "./motion/AnimatedEmoji";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialBookId?: string;
}

type Mode = "timer" | "manual";
type Applied = "yes" | "no" | "skip";

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

const MOODS = ["😌", "🤩", "🧠", "😴", "🥱", "🔥"];

/**
 * Logs a reading session, including the reflection step.
 *
 * The reflection is what turns a log into a habit: the reader notes what the
 * passage was about and whether they acted on yesterday's takeaway. That pair
 * feeds the "prime period" detection and gives the AI coach real context.
 */
export function LogSessionSheet({ visible, onClose, initialBookId }: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const { books, logSession } = useData();
  const { t } = useI18n();
  const confetti = useConfetti();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>("timer");
  const [bookId, setBookId] = useState<string | null>(initialBookId ?? null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [manualMinutes, setManualMinutes] = useState("30");
  const [pages, setPages] = useState("");
  const [summary, setSummary] = useState("");
  const [note, setNote] = useState("");
  const [applied, setApplied] = useState<Applied>("skip");
  const [mood, setMood] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const startedAt = useRef<number | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!visible) return;
    setRunning(false);
    setElapsed(0);
    setPages("");
    setSummary("");
    setNote("");
    setApplied("skip");
    setMood(null);
    setMode("timer");
    setSaving(false);
    startedAt.current = null;
    setBookId(initialBookId ?? books.find((b) => b.status === "reading")?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(timer);
  }, [running]);

  const minutes = mode === "timer" ? Math.max(1, Math.round(elapsed / 60)) : Number(manualMinutes) || 0;

  const save = async () => {
    if (minutes <= 0 || saving) return;
    setSaving(true);
    await logSession({
      book_id: bookId,
      started_at: new Date(startedAt.current ?? Date.now() - minutes * 60000).toISOString(),
      minutes,
      pages_read: Number(pages) || 0,
      note: note.trim() || null,
      summary: summary.trim() || null,
      applied_yesterday: applied === "skip" ? null : applied === "yes",
      mood,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    confetti.burst({ emojis: ["📚", "🎉", "✨", "🔥"], count: 16 });
    toast.show(t("log.saved", { minutes }), { emoji: "📚", tone: "success" });
    setSaving(false);
    onClose();
  };

  const toggleTimer = () => {
    if (!running && startedAt.current === null) startedAt.current = Date.now();
    Haptics.selectionAsync().catch(() => undefined);
    setRunning((r) => !r);
  };

  const reading = books.filter((b) => b.status === "reading" || b.status === "paused");

  return (
    <SheetFrame visible={visible} onClose={onClose} scroll>
      <Text style={[styles.title, { color: c.text }]}>{t("log.title")}</Text>

      <SegmentedControl
        style={{ marginBottom: 10 }}
        value={mode}
        onChange={setMode}
        options={[
          { value: "timer", label: t("log.timer") },
          { value: "manual", label: t("log.manual") },
        ]}
      />

      {mode === "timer" ? (
        <View style={styles.timerWrap}>
          <Text style={[styles.timer, { color: c.text }]}>{fmt(elapsed)}</Text>
          <Pressable
            onPress={toggleTimer}
            accessibilityRole="button"
            accessibilityLabel={running ? t("log.pause") : t("log.start")}
            style={[styles.timerBtn, { backgroundColor: running ? c.accentSoft : c.primarySoft }]}
          >
            <Text style={[styles.timerBtnText, { color: running ? c.accent : c.primary }]}>
              {running ? t("log.pause") : elapsed > 0 ? t("log.resume") : t("log.start")}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View>
          <Text style={[styles.label, { color: c.textMuted }]}>{t("log.minutes")}</Text>
          <TextInput
            value={manualMinutes}
            onChangeText={setManualMinutes}
            keyboardType="number-pad"
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
          />
        </View>
      )}

      <Text style={[styles.label, { color: c.textMuted }]}>{t("log.bookOptional")}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {reading.map((b) => {
          const active = b.id === bookId;
          const tint = b.cover_color ?? c.primary;
          return (
            <Pressable
              key={b.id}
              onPress={() => setBookId(active ? null : b.id)}
              style={[
                styles.chip,
                { borderColor: active ? tint : c.border, backgroundColor: active ? `${tint}22` : c.surface },
              ]}
            >
              <Text style={{ color: c.text, fontSize: 13 }} numberOfLines={1}>
                {b.title}
              </Text>
            </Pressable>
          );
        })}
        {reading.length === 0 && <Text style={{ color: c.textFaint, fontSize: 13 }}>{t("log.noBooks")}</Text>}
      </ScrollView>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t("log.pagesRead")}</Text>
          <TextInput
            value={pages}
            onChangeText={setPages}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={c.textFaint}
            style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: c.textMuted }]}>{t("log.mood")}</Text>
          <View style={styles.moodRow}>
            {MOODS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMood(mood === m ? null : m)}
                accessibilityRole="button"
                accessibilityState={{ selected: mood === m }}
                style={[
                  styles.mood,
                  {
                    borderColor: mood === m ? c.primary : c.border,
                    backgroundColor: mood === m ? c.primarySoft : "transparent",
                  },
                ]}
              >
                <Text style={{ fontSize: 16 }}>{m}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      {/* Reflection */}
      <Text style={[styles.label, { color: c.textMuted }]}>{t("log.summary")}</Text>
      <TextInput
        value={summary}
        onChangeText={setSummary}
        placeholder={t("log.summaryPlaceholder")}
        placeholderTextColor={c.textFaint}
        style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
      />

      <Text style={[styles.label, { color: c.textMuted }]}>{t("log.appliedYesterday")}</Text>
      <View style={styles.appliedRow}>
        {(["yes", "no", "skip"] as Applied[]).map((a) => {
          const active = applied === a;
          const tint = a === "yes" ? c.success : a === "no" ? c.warning : c.textMuted;
          return (
            <Pressable
              key={a}
              onPress={() => setApplied(a)}
              style={[
                styles.chip,
                { flex: 1, justifyContent: "center", borderColor: active ? tint : c.border, backgroundColor: active ? `${tint}22` : "transparent" },
              ]}
            >
              <Text style={{ color: active ? tint : c.textMuted, fontSize: 13, fontWeight: "700" }}>
                {a === "yes" ? t("common.yes") : a === "no" ? t("common.no") : t("common.skip")}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: c.textMuted }]}>{t("log.note")}</Text>
      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder={t("log.notePlaceholder")}
        placeholderTextColor={c.textFaint}
        style={[styles.input, styles.note, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        multiline
      />

      <View style={styles.actions}>
        <Button label={t("common.cancel")} variant="ghost" onPress={onClose} style={{ flex: 1 }} />
        <Button
          label={t("log.save", { minutes })}
          onPress={save}
          loading={saving}
          disabled={minutes <= 0}
          icon={<AnimatedEmoji size={16} loop>📖</AnimatedEmoji>}
          style={{ flex: 1.4 }}
        />
      </View>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 19, fontWeight: "800", marginBottom: 12 },
  label: { fontSize: 12.5, fontWeight: "600", marginTop: 14, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  note: { minHeight: 64, textAlignVertical: "top" },
  timerWrap: { alignItems: "center", paddingVertical: 14, gap: 12 },
  timer: { fontSize: 52, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -1 },
  timerBtn: { paddingHorizontal: 26, paddingVertical: 12, borderRadius: 999 },
  timerBtnText: { fontSize: 15, fontWeight: "700" },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, maxWidth: 220 },
  row: { flexDirection: "row", gap: 12 },
  moodRow: { flexDirection: "row", gap: 6 },
  mood: { width: 38, height: 40, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  appliedRow: { flexDirection: "row", gap: 8 },
  actions: { flexDirection: "row", gap: 12, marginTop: 22 },
});
