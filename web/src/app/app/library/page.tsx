"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { useData } from "@/store/data";
import { useI18n } from "@/i18n/provider";
import { PageHeader, EmptyState } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { AddBookDialog } from "@/components/add-book-dialog";
import { BookDetailDialog } from "@/components/book-detail-dialog";
import { categoryLabel } from "@/lib/reading";
import type { Book, BookStatus } from "@/data/types";
import type { TranslationKey } from "@/i18n";
import { cn } from "@/lib/utils";

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

/** Each status gets its own accent so a shelf is scannable at a glance. */
const STATUS_TONE: Record<BookStatus, "amber" | "teal" | "violet" | "rose"> = {
  reading: "teal",
  finished: "rose",
  wishlist: "violet",
  paused: "amber",
};

/**
 * Library — the shelf.
 *
 * Mobile-first: a single column of rows with a horizontally scrolling filter
 * strip (thumb-reachable), and a floating add button pinned above the tab bar.
 */
export default function LibraryPage() {
  const { t, lang } = useI18n();
  const { books, futureBooks, ready } = useData();

  const [filter, setFilter] = useState<BookStatus | "all">("all");
  const [query, setQuery] = useState("");
  const [showNext, setShowNext] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selected, setSelected] = useState<Book | null>(null);

  const source = showNext ? futureBooks : books;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source
      .filter((b) => (showNext || filter === "all" ? true : b.status === filter))
      .filter((b) =>
        q ? b.title.toLowerCase().includes(q) || (b.author ?? "").toLowerCase().includes(q) : true,
      );
  }, [filter, query, showNext, source]);

  return (
    <div>
      <PageHeader
        title={t("library.title")}
        accent="violet"
        subtitle={
          books.length === 1
            ? t("library.count", { count: books.length })
            : t("library.countPlural", { count: books.length })
        }
      />

      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("library.search")}
          className="pl-9"
          aria-label={t("library.search")}
        />
      </div>

      {/* Filter strip: horizontal scroll keeps every option thumb-reachable. */}
      <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          onClick={() => {
            setShowNext((v) => !v);
            setFilter("all");
          }}
          className={cn(
            "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
            showNext ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
          )}
        >
          📋 {t("library.shelfNext")} ({futureBooks.length})
        </button>
        {!showNext &&
          FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
                )}
              >
                {t(f.labelKey)}
              </button>
            );
          })}
      </div>

      <div className="mt-4 grid gap-3">
        {!ready ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            title={showNext ? t("library.emptyNext") : t("library.empty")}
            action={
              !showNext ? (
                <Button size="sm" onClick={() => setAddOpen(true)}>
                  {t("library.addBook")}
                </Button>
              ) : undefined
            }
          />
        ) : (
          filtered.map((book) => {
            const pct = book.totalPages > 0 ? (book.currentPage / book.totalPages) * 100 : 0;
            const cat = categoryLabel(book.category, lang);
            return (
              <Card
                key={book.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(book)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(book);
                  }
                }}
                className="surface-hover cursor-pointer overflow-hidden"
              >
                <CardContent className="flex items-center gap-3 p-4">
                  <div
                    className="grid h-16 w-12 shrink-0 place-items-center rounded-lg text-lg font-bold text-white shadow-soft"
                    style={{
                      backgroundColor: book.coverColor ?? "hsl(var(--primary))",
                      // A subtle inner sheen so the flat block reads as a spine.
                      backgroundImage:
                        "linear-gradient(135deg, hsl(0 0% 100% / 0.22), transparent 55%)",
                    }}
                    aria-hidden
                  >
                    {book.title.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-semibold">{book.title}</p>
                      <Badge variant={STATUS_TONE[book.status]} className="shrink-0">
                        {t(STATUS_KEY[book.status])}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {book.author ?? t("common.unknownAuthor")}
                      {cat ? ` · ${cat.icon} ${lang === "ar" ? cat.ar : cat.en}` : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Progress value={pct} className="h-1.5" />
                      <span className="shrink-0 text-xs font-medium tabular-nums text-teal-strong">
                        {Math.round(pct)}%
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Floating add: pinned clear of the tab bar and the home indicator. */}
      <Button
        size="lg"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-30 rounded-full shadow-lg md:bottom-8 md:right-8"
        onClick={() => setAddOpen(true)}
      >
        <Plus className="mr-1.5 h-4 w-4" aria-hidden />
        {t("library.addBook")}
      </Button>

      <AddBookDialog open={addOpen} onOpenChange={setAddOpen} />
      <BookDetailDialog book={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
