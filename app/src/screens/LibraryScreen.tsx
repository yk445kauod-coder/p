import React, { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, TextInput } from "../components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeProvider";
import { useData, type Book, type BookStatus } from "../store/data";
import { useI18n, type TranslationKey } from "../i18n";
import { Card, ProgressBar, Badge } from "../components/ui";
import { GradientMesh } from "../components/visuals";
import { AddBookSheet } from "../components/AddBookSheet";
import { BookDetailSheet } from "../components/BookDetailSheet";
import { categoryLabel } from "../domain/achievements";
import { useResponsive } from "../components/layout";
import { useEntitlements } from "../store/entitlements";
import { openPaywall } from "../ai/bus";

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
  const { wide, gutter } = useResponsive();
  const { maxActiveBooks, isPro } = useEntitlements();
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

  // Free readers cap the active shelf; the add button routes to the paywall.
  const activeCount = books.filter((b) => b.status === "reading").length;
  const atBookLimit = !isPro && activeCount >= maxActiveBooks;

  const tryAdd = () => {
    if (atBookLimit) {
      openPaywall();
      return;
    }
    setAddOpen(true);
  };

  return (
    <View style={{ flex: 1 }}>
      <GradientMesh />
      <View style={[styles.header, { paddingTop: insets.top + 14, paddingHorizontal: gutter }]}>
        <View style={{ width: "100%", maxWidth: theme.container.content, alignSelf: "center" }}>
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
              <Text style={{ color: showNext ? c.accent : c.textMuted, fontSize: 13, fontWeight: "700" }}>
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
                    <Text style={{ color: active ? c.primary : c.textMuted, fontSize: 13, fontWeight: "700" }}>
                      {t(f.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
          </ScrollView>

          {atBookLimit ? (
            <Pressable onPress={openPaywall} accessibilityRole="button" style={{ marginBottom: 10 }}>
              <Card style={{ flexDirection: "row", alignItems: "center", gap: 10, borderColor: c.premium, paddingVertical: 12 }}>
                <Text style={{ fontSize: 16 }}>✨</Text>
                <Text style={{ flex: 1, color: c.text, fontSize: 12.5, fontWeight: "700" }}>
                  {t("paywall.gateBooks", { count: maxActiveBooks })}
                </Text>
                <Text style={{ color: c.premium, fontSize: 12.5, fontWeight: "800" }}>{t("paywall.pro")} ›</Text>
              </Card>
            </Pressable>
          ) : null}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(b) => b.id}
        // Two columns once there is room; a single list on phones.
        key={wide ? "grid" : "list"}
        numColumns={wide ? 2 : 1}
        columnWrapperStyle={wide ? { gap: 14 } : undefined}
        contentContainerStyle={{
          paddingHorizontal: gutter,
          paddingBottom: 150,
          gap: 14,
          width: "100%",
          maxWidth: theme.container.content,
          alignSelf: "center",
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Card style={{ alignItems: "center", gap: 10, paddingVertical: 26 }}>
            <Text style={{ fontSize: 30 }}>🔍</Text>
            <Text style={{ color: c.textMuted, fontSize: 14, lineHeight: 21, textAlign: "center" }}>
              {showNext ? t("library.emptyNext") : t("library.empty")}
            </Text>
          </Card>
        }
        renderItem={({ item }) => {
          const pct = item.total_pages ? item.current_page / item.total_pages : 0;
          const cat = categoryLabel(item.category, lang);
          return (
            <View style={{ flex: wide ? 1 : undefined }}>
              <Card interactive onPress={() => setSelected(item)} accessibilityLabel={item.title}>
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
            </View>
          );
        }}
      />

      <Pressable
        onPress={tryAdd}
        style={({ pressed }) => [
          styles.fab,
          { backgroundColor: atBookLimit ? c.premium : c.primary, bottom: insets.bottom + 92, opacity: pressed ? 0.9 : 1 },
          theme.elevation.lg,
        ]}
        accessibilityRole="button"
        accessibilityLabel={t("library.addBook")}
      >
        <Text style={{ color: atBookLimit ? "#241B00" : c.onPrimary, fontSize: 22, fontWeight: "800", marginTop: -2 }}>
          {atBookLimit ? "✨" : "+"}
        </Text>
        <Text style={{ color: atBookLimit ? "#241B00" : c.onPrimary, fontSize: 15, fontWeight: "800" }}>
          {atBookLimit ? t("paywall.pro") : t("library.addBook")}
        </Text>
      </Pressable>

      <AddBookSheet visible={addOpen} onClose={() => setAddOpen(false)} />
      <BookDetailSheet book={selected} onClose={() => setSelected(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 4 },
  title: { fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  subtitle: { fontSize: 13 },
  search: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, marginTop: 12, fontSize: 15 },
  filters: { gap: 8, paddingVertical: 12 },
  filterChip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  bookRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  cover: { width: 52, height: 68, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  coverInitial: { color: "#fff", fontSize: 24, fontWeight: "900" },
  bookTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  bookTitle: { fontSize: 16, fontWeight: "800", flex: 1 },
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
