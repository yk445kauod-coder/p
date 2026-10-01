import React, { useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useData, type BookStatus } from "../store/data";
import { useI18n, type TranslationKey } from "../i18n";
import { Button } from "./ui";

const STATUS_KEY: Record<BookStatus, TranslationKey> = {
  reading: "library.status.reading",
  finished: "library.status.finished",
  wishlist: "library.status.wishlist",
  paused: "library.status.paused",
};

const COVER_COLORS = ["#3F6B57", "#C4622D", "#6C5CE7", "#2D7DB3", "#B4443B", "#C99A2E", "#7A5C3E", "#4B5563"];

export function AddBookSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { addBook } = useData();
  const { t } = useI18n();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [status, setStatus] = useState<BookStatus>("reading");
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle("");
    setAuthor("");
    setTotalPages("");
    setStatus("reading");
    setColor(COVER_COLORS[0]);
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await addBook({
      title: title.trim(),
      author: author.trim() || null,
      totalPages: Number(totalPages) || 0,
      currentPage: 0,
      status,
      coverColor: color,
    });
    setSaving(false);
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.sheet, { backgroundColor: c.bgElevated, paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={[styles.handle, { backgroundColor: c.border }]} />
            <Text style={[styles.title, { color: c.text }]}>{t("addBook.title")}</Text>

            <Text style={[styles.label, { color: c.textMuted }]}>{t("addBook.bookTitle")}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("addBook.titlePlaceholder")}
              placeholderTextColor={c.textFaint}
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
            />

            <Text style={[styles.label, { color: c.textMuted }]}>{t("addBook.author")}</Text>
            <TextInput
              value={author}
              onChangeText={setAuthor}
              placeholder={t("common.optional")}
              placeholderTextColor={c.textFaint}
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
            />

            <Text style={[styles.label, { color: c.textMuted }]}>{t("addBook.totalPages")}</Text>
            <TextInput
              value={totalPages}
              onChangeText={setTotalPages}
              keyboardType="number-pad"
              placeholder={t("addBook.totalPagesPlaceholder")}
              placeholderTextColor={c.textFaint}
              style={[styles.input, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
            />

            <Text style={[styles.label, { color: c.textMuted }]}>{t("addBook.status")}</Text>
            <View style={styles.statusRow}>
              {(["reading", "wishlist", "finished"] as BookStatus[]).map((s) => {
                const active = status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[
                      styles.statusChip,
                      { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : "transparent" },
                    ]}
                  >
                    <Text style={{ color: active ? c.primary : c.textMuted, fontSize: 13, fontWeight: "600" }}>
                      {t(STATUS_KEY[s])}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.label, { color: c.textMuted }]}>{t("addBook.coverColour")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.swatches}>
              {COVER_COLORS.map((col) => (
                <Pressable
                  key={col}
                  onPress={() => setColor(col)}
                  style={[
                    styles.swatch,
                    { backgroundColor: col, borderColor: col === color ? c.text : "transparent" },
                  ]}
                  accessibilityLabel={t("addBook.colour", { hex: col })}
                />
              ))}
            </ScrollView>

            <View style={styles.actions}>
              <Button label={t("common.cancel")} variant="ghost" onPress={onClose} style={{ flex: 1 }} />
              <Button label={t("common.add")} onPress={save} loading={saving} disabled={!title.trim()} style={{ flex: 1.4 }} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  handle: { width: 44, height: 5, borderRadius: 999, alignSelf: "center", marginBottom: 8 },
  title: { fontSize: 19, fontWeight: "800", marginBottom: 8 },
  label: { fontSize: 12.5, marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  statusRow: { flexDirection: "row", gap: 8 },
  statusChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  swatches: { gap: 10, paddingVertical: 4 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3 },
  actions: { flexDirection: "row", gap: 12, marginTop: 18 },
});
