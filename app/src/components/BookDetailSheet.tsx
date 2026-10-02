import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";
import { useData, type Book, type BookStatus } from "../store/data";
import { useI18n, type TranslationKey } from "../i18n";
import { Button, ProgressBar } from "./ui";
import { SheetFrame } from "./SheetFrame";
import { categoryLabel } from "../domain/achievements";
import { useToast } from "./motion/Toast";

const STATUS_KEY: Record<BookStatus, TranslationKey> = {
  reading: "library.status.reading",
  finished: "library.status.finished",
  wishlist: "library.status.wishlist",
  paused: "library.status.paused",
};

export function BookDetailSheet({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const theme = useTheme();
  const c = theme.colors;
  const { updateBook, deleteBook, sessions, quotes, addQuote } = useData();
  const { t, lang } = useI18n();
  const toast = useToast();

  const [pageInput, setPageInput] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const bookSessions = useMemo(
    () => (book ? sessions.filter((s) => s.book_id === book.id) : []),
    [book, sessions],
  );
  const bookQuotes = useMemo(
    () => (book ? quotes.filter((q) => q.book_id === book.id) : []),
    [book, quotes],
  );
  const minutes = bookSessions.reduce((a, s) => a + s.minutes, 0);

  if (!book) return null;

  const pct = book.total_pages ? book.current_page / book.total_pages : 0;
  const cat = categoryLabel(book.category, lang);

  const savePage = () => {
    const p = Number(pageInput);
    if (!Number.isFinite(p)) return;
    const done = book.total_pages > 0 && p >= book.total_pages;
    updateBook(book.id, {
      current_page: p,
      status: (done ? "finished" : book.status) as BookStatus,
    });
    if (done) toast.show(t("book.finishedToast"), { emoji: "🏆", tone: "success" });
    setPageInput("");
  };

  const saveQuote = async () => {
    if (!quoteText.trim()) return;
    await addQuote({ book_id: book.id, text: quoteText.trim(), page: book.current_page });
    setQuoteText("");
    toast.show(t("book.quoteSaved"), { emoji: "✍️", tone: "success" });
  };

  return (
    <SheetFrame visible={!!book} onClose={onClose} scroll maxHeight="88%">
      <View style={styles.head}>
        <View style={[styles.cover, { backgroundColor: book.cover_color ?? c.primary }]}>
          <Text style={styles.coverInitial}>{book.title.slice(0, 1).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.text }]}>{book.title}</Text>
          <Text style={[styles.author, { color: c.textMuted }]}>
            {book.author ?? t("common.unknownAuthor")}
          </Text>
          {cat ? (
            <View style={[styles.catChip, { backgroundColor: c.surfaceAlt }]}>
              <Text style={{ fontSize: 12 }}>{cat.icon}</Text>
              <Text style={{ color: c.textMuted, fontSize: 12, fontWeight: "600" }}>
                {lang === "ar" ? cat.ar : cat.en}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label={t("book.progress")} value={`${Math.round(pct * 100)}%`} />
        <Stat label={t("book.pages")} value={`${book.current_page}/${book.total_pages || "—"}`} />
        <Stat label={t("book.time")} value={`${minutes}m`} />
        <Stat label={t("book.sessions")} value={`${bookSessions.length}`} />
      </View>

      <ProgressBar value={pct} color={book.cover_color ?? c.primary} />

      <Text style={[styles.section, { color: c.text }]}>{t("book.updateProgress")}</Text>
      <View style={styles.row}>
        <TextInput
          value={pageInput}
          onChangeText={setPageInput}
          keyboardType="number-pad"
          placeholder={t("book.currentPage", { page: book.current_page })}
          placeholderTextColor={c.textFaint}
          style={[styles.input, { flex: 1, color: c.text, borderColor: c.border, backgroundColor: c.surface }]}
        />
        <Button label={t("common.set")} onPress={savePage} disabled={!pageInput} />
      </View>

      <Text style={[styles.section, { color: c.text }]}>{t("addBook.status")}</Text>
      <View style={styles.wrapRow}>
        {(["reading", "paused", "finished", "wishlist"] as BookStatus[]).map((s) => {
          const active = book.status === s;
          return (
            <Pressable
              key={s}
              onPress={() => updateBook(book.id, { status: s })}
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

      <Text style={[styles.section, { color: c.text }]}>{t("book.quotes")}</Text>
      {bookQuotes.length === 0 ? (
        <Text style={{ color: c.textFaint, fontSize: 13 }}>{t("book.noQuotes")}</Text>
      ) : (
        bookQuotes.map((q) => (
          <View key={q.id} style={[styles.quote, { borderColor: c.border }]}>
            <Text style={{ color: c.text, fontSize: 14, lineHeight: 20, fontStyle: "italic" }}>“{q.text}”</Text>
            {q.page ? (
              <Text style={{ color: c.textFaint, fontSize: 11.5, marginTop: 4 }}>
                {t("book.pageShort", { page: q.page })}
              </Text>
            ) : null}
          </View>
        ))
      )}
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

      <View style={{ marginTop: 24 }}>
        <Button
          label={confirmDelete ? t("book.deleteConfirm") : t("book.delete")}
          variant={confirmDelete ? "danger" : "ghost"}
          onPress={async () => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              return;
            }
            await deleteBook(book.id);
            onClose();
          }}
        />
      </View>
    </SheetFrame>
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
  head: { flexDirection: "row", gap: 14, alignItems: "center" },
  cover: { width: 56, height: 74, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  coverInitial: { color: "#fff", fontSize: 26, fontWeight: "800" },
  title: { fontSize: 19, fontWeight: "800" },
  author: { fontSize: 13, marginTop: 2 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, marginTop: 6 },
  statsRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 18 },
  stat: { alignItems: "center" },
  statValue: { fontSize: 17, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  section: { fontSize: 15.5, fontWeight: "700", marginTop: 22, marginBottom: 8 },
  row: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 },
  quote: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, marginBottom: 8 },
});
