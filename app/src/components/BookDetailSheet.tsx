import React, { useMemo, useState } from "react";
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
import { useData, type Book, type BookStatus } from "../store/data";
import { useI18n, type TranslationKey } from "../i18n";
import { Button, ProgressBar } from "./ui";

const STATUS_KEY: Record<BookStatus, TranslationKey> = {
  reading: "library.status.reading",
  finished: "library.status.finished",
  wishlist: "library.status.wishlist",
  paused: "library.status.paused",
};

export function BookDetailSheet({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const theme = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const { updateBook, deleteBook, sessions, quotes, addQuote } = useData();
  const { t } = useI18n();

  const [pageInput, setPageInput] = useState("");
  const [quoteText, setQuoteText] = useState("");

  const bookSessions = useMemo(
    () => (book ? sessions.filter((s) => s.bookId === book.id) : []),
    [book, sessions],
  );
  const bookQuotes = useMemo(
    () => (book ? quotes.filter((q) => q.bookId === book.id) : []),
    [book, quotes],
  );
  const minutes = bookSessions.reduce((a, s) => a + s.minutes, 0);

  if (!book) return null;

  const pct = book.totalPages ? book.currentPage / book.totalPages : 0;

  const setStatus = (status: BookStatus) => updateBook(book.id, { status });

  const savePage = () => {
    const p = Number(pageInput);
    if (!Number.isFinite(p)) return;
    updateBook(book.id, { currentPage: p, status: p >= book.totalPages && book.totalPages > 0 ? "finished" : book.status });
    setPageInput("");
  };

  const saveQuote = async () => {
    if (!quoteText.trim()) return;
    await addQuote({ bookId: book.id, text: quoteText.trim(), page: book.currentPage });
    setQuoteText("");
  };

  return (
    <Modal visible={!!book} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView
            style={[styles.sheet, { backgroundColor: c.bgElevated }]}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.handle, { backgroundColor: c.border }]} />
            <View style={styles.head}>
              <View style={[styles.cover, { backgroundColor: book.coverColor ?? c.primary }]}>
                <Text style={styles.coverInitial}>{book.title.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: c.text }]}>{book.title}</Text>
                <Text style={[styles.author, { color: c.textMuted }]}>{book.author ?? t("common.unknownAuthor")}</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <Stat label={t("book.progress")} value={`${Math.round(pct * 100)}%`} />
              <Stat label={t("book.pages")} value={`${book.currentPage}/${book.totalPages || "—"}`} />
              <Stat label={t("book.time")} value={`${minutes}m`} />
              <Stat label={t("book.sessions")} value={`${bookSessions.length}`} />
            </View>

            <ProgressBar value={pct} color={book.coverColor ?? c.primary} />

            <Text style={[styles.section, { color: c.text }]}>{t("book.updateProgress")}</Text>
            <View style={styles.row}>
              <TextInput
                value={pageInput}
                onChangeText={setPageInput}
                keyboardType="number-pad"
                placeholder={t("book.currentPage", { page: book.currentPage })}
                placeholderTextColor={c.textFaint}
                style={[styles.input, { flex: 1, color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
              <Button label={t("common.set")} onPress={savePage} disabled={!pageInput} />
            </View>

            <Text style={[styles.section, { color: c.text }]}>{t("addBook.status")}</Text>
            <View style={styles.statusRow}>
              {(["reading", "paused", "finished", "wishlist"] as BookStatus[]).map((s) => {
                const active = book.status === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => setStatus(s)}
                    style={[
                      styles.statusChip,
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

            <Text style={[styles.section, { color: c.text }]}>{t("book.quotes")}</Text>
            {bookQuotes.map((q) => (
              <View key={q.id} style={[styles.quote, { borderColor: c.border }]}>
                <Text style={{ color: c.text, fontSize: 14, lineHeight: 20, fontStyle: "italic" }}>
                  “{q.text}”
                </Text>
                {q.page ? <Text style={{ color: c.textFaint, fontSize: 11.5, marginTop: 4 }}>{t("book.pageShort", { page: q.page })}</Text> : null}
              </View>
            ))}
            <View style={styles.row}>
              <TextInput
                value={quoteText}
                onChangeText={setQuoteText}
                placeholder={t("book.quotePlaceholder")}
                placeholderTextColor={c.textFaint}
                style={[styles.input, { flex: 1, color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
              />
              <Button label={t("common.save")} variant="ghost" onPress={saveQuote} disabled={!quoteText.trim()} />
            </View>

            <View style={{ marginTop: 22 }}>
              <Button
                label={t("book.delete")}
                variant="danger"
                onPress={async () => {
                  await deleteBook(book.id);
                  onClose();
                }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const c = useTheme().colors;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: c.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textFaint }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: { maxHeight: "88%", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  handle: { width: 44, height: 5, borderRadius: 999, alignSelf: "center", marginBottom: 14 },
  head: { flexDirection: "row", gap: 14, alignItems: "center" },
  cover: { width: 56, height: 74, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  coverInitial: { color: "#fff", fontSize: 26, fontWeight: "800" },
  title: { fontSize: 19, fontWeight: "800" },
  author: { fontSize: 13, marginTop: 2 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 18 },
  stat: { alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  section: { fontSize: 15.5, fontWeight: "700", marginTop: 22, marginBottom: 8 },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  quote: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, marginBottom: 8 },
});
