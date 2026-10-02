import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useData, type Book, type BookStatus } from "../store/data";
import { useI18n, type TranslationKey } from "../i18n";
import { Card, ProgressBar, Badge } from "../components/ui";
import { GridBackground } from "../components/visuals";
import { AddBookSheet } from "../components/AddBookSheet";
import { BookDetailSheet } from "../components/BookDetailSheet";
import { categoryLabel } from "../domain/achievements";

const FILTERS: { key: BookStatus | "all"; labelKey: TranslationKey }[] = [
  { key: "all", labelKey: "library.filter.all" },
  { key: "reading", labelKey: "library.filter.reading" },
  { key: "finished", labelKey: "library.filter.finished" },
  { key: "wishlist", labelKey: "library.filter.wishlist" },
  { key: "paused", labelKey: "library.filter.paused" },
];

const STATUS_KEY: Record<BookStatus, TranslationKey> = {
  reading: "library.status.reading",
  finished: "library.status.finished",
  wishlist: "library.status.wishlist",
  paused: "library.status.paused",
};

export function LibraryScreen() {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { books, futureBooks } = useData();
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<BookStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);
  const [showNext, setShowNext] = useState(false);

  const source = showNext ? futureBooks : books;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source
      .filter((b) => (showNext || filter === "all" ? true : b.status === filter))
      .filter((b) => (q ? b.title.toLowerCase().includes(q) || (b.author ?? "").toLowerCase().includes(q) : true));
  }, [filter, query, showNext, source]);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <GridBackground />
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={[styles.title, { color: c.text }]}>{t("library.title")}</Text>
        <Text style={[styles.subtitle, { color: c.textMuted }]}>
          {books.length === 1 ? t("library.count", { count: books.length }) : t("library.countPlural", { count: books.length })}
        </Text>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("library.search")}
          placeholderTextColor={c.textFaint}
          style={[styles.search, { color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Pressable
            onPress={() => {
              setShowNext((v) => !v);
              setFilter("all");
            }}
            style={[
              styles.filterChip,
              { borderColor: showNext ? c.accent : c.border, backgroundColor: showNext ? c.accentSoft : "transparent" },
            ]}
          >
            <Text style={{ color: showNext ? c.accent : c.textMuted, fontSize: 13, fontWeight: "600" }}>
              📋 {t("addBook.shelfNext")} ({futureBooks.length})
            </Text>
          </Pressable>
          {!showNext &&
            FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[
                    styles.filterChip,
                    { borderColor: active ? c.primary : c.border, backgroundColor: active ? c.primarySoft : "transparent" },
                  ]}
                >
                  <Text style={{ color: active ? c.primary : c.textMuted, fontSize: 13, fontWeight: "600" }}>
                    {t(f.labelKey)}
                  </Text>
                </Pressable>
              );
            })}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        contentContainerStyle={{ padding: 20, paddingBottom: 150, gap: 12 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card>
            <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 21 }}>
              {showNext ? t("library.emptyNext") : t("library.empty")}
            </Text>
          </Card>
        }
        renderItem={({ item }) => {
          const pct = item.total_pages ? item.current_page / item.total_pages : 0;
          const cat = categoryLabel(item.category, lang);
          return (
            <Pressable onPress={() => setSelected(item)} accessibilityRole="button">
              <Card>
                <View style={styles.bookRow}>
                  <View style={[styles.cover, { backgroundColor: item.cover_color ?? c.primary }]}>
                    <Text style={styles.coverInitial}>{item.title.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.bookTop}>
                      <Text style={[styles.bookTitle, { color: c.text }]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Badge text={t(STATUS_KEY[item.status])} tone={item.status === "finished" ? "accent" : "primary"} />
                    </View>
                    <Text style={[styles.bookAuthor, { color: c.textMuted }]} numberOfLines={1}>
                      {item.author ?? t("common.unknownAuthor")}
                      {cat ? ` · ${cat.icon} ${lang === "ar" ? cat.ar : cat.en}` : ""}
                    </Text>
                    <View style={styles.progressRow}>
                      <ProgressBar value={pct} color={item.cover_color ?? c.primary} />
                      <Text style={[styles.progressText, { color: c.textMuted }]}>{Math.round(pct * 100)}%</Text>
                    </View>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={() => setAddOpen(true)}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: c.primary, bottom: insets.bottom + 92, opacity: pressed ? 0.9 : 1 },
          theme.shadowLg,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("library.addBook")}
      >
        <Text style={{ color: c.onPrimary, fontSize: 22, fontWeight: "700", marginTop: -2 }}>+</Text>
        <Text style={{ color: c.onPrimary, fontSize: 15, fontWeight: "700" }}>{t("library.addBook")}</Text>
      </Pressable>

      <AddBookSheet visible={addOpen} onClose={() => setAddOpen(false)} />
      <BookDetailSheet book={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, gap: 4 },
  title: { fontSize: 26, fontWeight: "800", letterSpacing: -0.6 },
  subtitle: { fontSize: 13 },
  search: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, marginTop: 12, fontSize: 15 },
  filters: { gap: 8, paddingVertical: 12 },
  filterChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  bookRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  cover: { width: 52, height: 68, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  coverInitial: { color: "#fff", fontSize: 24, fontWeight: "800" },
  bookTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  bookTitle: { fontSize: 16, fontWeight: "700", flex: 1 },
  bookAuthor: { fontSize: 12.5, marginTop: 2 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
  progressText: { fontSize: 11.5, minWidth: 38, textAlign: "right" },
  fab: {
    position: "absolute",
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    height: 54,
    borderRadius: 999,
  },
});
