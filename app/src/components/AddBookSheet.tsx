import React, { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useData, type BookStatus } from "../store/data";
import { useI18n, type TranslationKey } from "../i18n";
import { Button, Input, SegmentedControl } from "./ui";
import { CATEGORIES } from "../domain/achievements";
import { SheetFrame } from "./SheetFrame";

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
  const { t, lang } = useI18n();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("");
  const [status, setStatus] = useState<BookStatus>("reading");
  const [color, setColor] = useState(COVER_COLORS[0]);
  const [category, setCategory] = useState<string | null>(null);
  const [shelf, setShelf] = useState<"now" | "next">("now");
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  // Reset-on-open is intentionally a fresh form each time the sheet appears.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!visible) return;
    setTitle("");
    setAuthor("");
    setTotalPages("");
    setStatus("reading");
    setColor(COVER_COLORS[0]);
    setCategory(null);
    setShelf("now");
    setTouched(false);
  }, [visible]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const save = async () => {
    setTouched(true);
    if (!title.trim()) return;
    setSaving(true);
    await addBook({
      title: title.trim(),
      author: author.trim() || null,
      total_pages: Number(totalPages) || 0,
      current_page: 0,
      status,
      cover_color: color,
      category,
      is_future: shelf === "next",
    });
    setSaving(false);
    onClose();
  };

  return (
    <SheetFrame visible={visible} onClose={onClose} scroll>
      <Text style={[styles.title, { color: c.text }]}>{t("addBook.title")}</Text>

      <SegmentedControl
        style={{ marginBottom: 4 }}
        value={shelf}
        onChange={setShelf}
        options={[
          { value: "now", label: t("addBook.shelfNow") },
          { value: "next", label: t("addBook.shelfNext") },
        ]}
      />

      <Input
        label={t("addBook.bookTitle")}
        value={title}
        onChangeText={setTitle}
        placeholder={t("addBook.titlePlaceholder")}
        error={touched && !title.trim() ? t("addBook.titleRequired") : null}
        autoFocus
      />
      <Input label={t("addBook.author")} value={author} onChangeText={setAuthor} placeholder={t("common.optional")} />
      <Input
        label={t("addBook.totalPages")}
        value={totalPages}
        onChangeText={setTotalPages}
        keyboardType="number-pad"
        placeholder={t("addBook.totalPagesPlaceholder")}
      />

      <Text style={[styles.label, { color: c.textMuted }]}>{t("addBook.category")}</Text>
      <View style={styles.wrapRow}>
        {CATEGORIES.map((cat) => {
          const active = category === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => setCategory(active ? null : cat.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[
                styles.chip,
                {
                  borderColor: active ? c.primary : c.border,
                  backgroundColor: active ? c.primarySoft : "transparent",
                },
              ]}
            >
              <Text style={{ fontSize: 13 }}>{cat.icon}</Text>
              <Text style={{ color: active ? c.primary : c.textMuted, fontSize: 12.5, fontWeight: "600" }}>
                {lang === "ar" ? cat.ar : cat.en}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.label, { color: c.textMuted }]}>{t("addBook.status")}</Text>
      <View style={styles.wrapRow}>
        {(["reading", "wishlist", "finished"] as BookStatus[]).map((s) => {
          const active = status === s;
          return (
            <Pressable
              key={s}
              onPress={() => setStatus(s)}
              style={[
                styles.chip,
                { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : "transparent" },
              ]}
            >
              <Text style={{ color: active ? c.primary : c.textMuted, fontSize: 12.5, fontWeight: "600" }}>
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
            accessibilityRole="button"
            accessibilityLabel={t("addBook.colour", { hex: col })}
            style={[
              styles.swatch,
              {
                backgroundColor: col,
                borderColor: col === color ? c.text : "transparent",
                transform: [{ scale: col === color ? 1.1 : 1 }],
              },
            ]}
          />
        ))}
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <Button label={t("common.cancel")} variant="ghost" onPress={onClose} style={{ flex: 1 }} />
        <Button
          label={t("common.add")}
          onPress={save}
          loading={saving}
          disabled={!title.trim()}
          style={{ flex: 1.4 }}
        />
      </View>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 19, fontWeight: "800", marginBottom: 10 },
  label: { fontSize: 12.5, fontWeight: "600", marginTop: 14, marginBottom: 8 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  swatches: { gap: 12, paddingVertical: 6, paddingHorizontal: 2 },
  swatch: { width: 38, height: 38, borderRadius: 19, borderWidth: 3 },
  actions: { flexDirection: "row", gap: 12, marginTop: 22 },
});
