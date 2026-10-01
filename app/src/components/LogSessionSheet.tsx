import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useData } from "../store/data";
import { useI18n } from "../i18n";
import { Button } from "./ui";

interface Props {
  visible: boolean;
  onClose: () => void;
  initialBookId?: string;
}

type Mode = "timer" | "manual";

const fmt = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
};

export function LogSessionSheet({ visible, onClose, initialBookId }: Props) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { books, logSession } = useData();
  const { t } = useI18n();

  const [mode, setMode] = useState<Mode>("timer");
  const [bookId, setBookId] = useState<string | null>(initialBookId ?? null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [manualMinutes, setManualMinutes] = useState("30");
  const [pages, setPages] = useState("");
  const [note, setNote] = useState("");
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!visible) return;
    setRunning(false);
    setElapsed(0);
    setPages("");
    setNote("");
    setMode("timer");
    setBookId(initialBookId ?? books.find((b) => b.status === "reading")?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const minutes = mode === "timer" ? Math.max(1, Math.round(elapsed / 60)) : Number(manualMinutes) || 0;

  const save = async () => {
    if (minutes <= 0) return;
    await logSession({
      bookId,
      startedAt: startedAt.current ?? Date.now() - minutes * 60000,
      endedAt: Date.now(),
      minutes,
      pagesRead: Number(pages) || 0,
      note: note.trim() || null,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    onClose();
  };

  const toggleTimer = () => {
    if (!running && startedAt.current === null) startedAt.current = Date.now();
    Haptics.selectionAsync().catch(() => undefined);
    setRunning((r) => !r);
  };

  const reading = books.filter((b) => b.status === "reading" || b.status === "paused");

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: c.bgElevated, paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <View style={[styles.handle, { backgroundColor: c.border }]} />
            <Text style={[styles.title, { color: c.text }]}>{t("log.title")}</Text>

            {/* Mode switch */}
            <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
              {(["timer", "manual"] as Mode[]).map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  style={[styles.segmentItem, mode === m && { backgroundColor: c.surface }]}
                >
                  <Text style={[styles.segmentText, { color: mode === m ? c.text : c.textMuted }]}>
                    {m === "timer" ? t("log.timer") : t("log.manual")}
                  </Text>
                </Pressable>
              ))}
            </View>

            {mode === "timer" ? (
              <View style={styles.timerWrap}>
                <Text style={[styles.timer, { color: c.text }]}>{fmt(elapsed)}</Text>
                <Pressable
                  onPress={toggleTimer}
                  style={[styles.timerBtn, { backgroundColor: running ? c.accentSoft : c.primarySoft }]}
                  accessibilityLabel={running ? "Pause timer" : "Start timer"}
                >
                  <Text style={[styles.timerBtnText, { color: running ? c.accent : c.primary }]}>
                    {running ? t("log.pause") : elapsed > 0 ? t("log.resume") : t("log.start")}
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.field}>
                <Text style={[styles.label, { color: c.textMuted }]}>{t("log.minutes")}</Text>
                <TextInput
                  value={manualMinutes}
                  onChangeText={setManualMinutes}
                  keyboardType="number-pad"
                  style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
                />
              </View>
            )}

            {/* Book picker */}
            <Text style={[styles.label, { color: c.textMuted }]}>{t("log.bookOptional")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {reading.map((b) => {
                const active = b.id === bookId;
                return (
                  <Pressable
                    key={b.id}
                    onPress={() => setBookId(active ? null : b.id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? b.coverColor ?? c.primary : c.border,
                        backgroundColor: active ? `${(b.coverColor ?? c.primary)}22` : c.surface,
                      },
                    ]}
                  >
                    <Text style={{ color: c.text, fontSize: 13 }} numberOfLines={1}>
                      {b.title}
                    </Text>
                  </Pressable>
                );
              })}
              {reading.length === 0 && (
                <Text style={{ color: c.textFaint, fontSize: 13 }}>{t("log.noBooks")}</Text>
              )}
            </ScrollView>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 1 }]}>
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
                disabled={minutes <= 0}
                style={{ flex: 1.4 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, gap: 8 },
  handle: { width: 44, height: 5, borderRadius: 999, alignSelf: "center", marginBottom: 8 },
  title: { fontSize: 19, fontWeight: "800", marginBottom: 4 },
  segment: { flexDirection: "row", borderRadius: 14, padding: 4, gap: 4 },
  segmentItem: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: "center" },
  segmentText: { fontSize: 14, fontWeight: "700" },
  timerWrap: { alignItems: "center", paddingVertical: 14, gap: 12 },
  timer: { fontSize: 52, fontWeight: "800", fontVariant: ["tabular-nums"], letterSpacing: -1 },
  timerBtn: { paddingHorizontal: 26, paddingVertical: 12, borderRadius: 999 },
  timerBtnText: { fontSize: 15, fontWeight: "700" },
  field: { gap: 6 },
  label: { fontSize: 12.5, marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  note: { minHeight: 64, textAlignVertical: "top" },
  chips: { gap: 8, paddingVertical: 4 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, maxWidth: 200 },
  row: { flexDirection: "row", gap: 12 },
  actions: { flexDirection: "row", gap: 12, marginTop: 14 },
});
