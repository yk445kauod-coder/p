"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useData } from "@/store/data";
import { useI18n } from "@/i18n/provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/reading";
import type { BookStatus } from "@/data/types";
import type { TranslationKey } from "@/i18n";

const STATUS_KEY: Record<BookStatus, TranslationKey> = {
  reading: "library.status.reading",
  finished: "library.status.finished",
  wishlist: "library.status.wishlist",
  paused: "library.status.paused",
};

const COVER_COLORS = ["#d97706", "#0ea5e9", "#8b5cf6", "#e11d48", "#059669", "#64748b"];

/** Add a book. One column of fields so it works from 320px up. */
export function AddBookDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, lang } = useI18n();
  const { addBook } = useData();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [totalPages, setTotalPages] = useState("300");
  const [currentPage, setCurrentPage] = useState("0");
  const [status, setStatus] = useState<BookStatus>("reading");
  const [category, setCategory] = useState<string>("none");
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0]);
  const [isFuture, setIsFuture] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setAuthor("");
    setTotalPages("300");
    setCurrentPage("0");
    setStatus("reading");
    setCategory("none");
    setCoverColor(COVER_COLORS[0]);
    setIsFuture(false);
  }, [open]);

  const submit = async () => {
    if (!title.trim()) {
      toast.error(t("addBook.titleRequired"));
      return;
    }
    setBusy(true);
    try {
      await addBook({
        title: title.trim(),
        author: author.trim() || null,
        totalPages: Math.max(0, Math.round(Number(totalPages) || 0)),
        currentPage: Math.max(0, Math.round(Number(currentPage) || 0)),
        status: isFuture ? "wishlist" : status,
        category: category === "none" ? null : category,
        coverColor,
        isFuture,
      });
      toast.success(t("library.added"), { icon: "📚" });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("addBook.title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("addBook.title")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="book-title">{t("addBook.bookTitle")}</Label>
            <Input
              id="book-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("addBook.titlePlaceholder")}
              autoFocus
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="book-author">
              {t("addBook.author")} <span className="text-muted-foreground">({t("common.optional")})</span>
            </Label>
            <Input
              id="book-author"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder={t("addBook.authorPlaceholder")}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="book-total">{t("addBook.totalPages")}</Label>
              <Input
                id="book-total"
                type="number"
                inputMode="numeric"
                min={0}
                value={totalPages}
                onChange={(e) => setTotalPages(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="book-current">{t("addBook.currentPage")}</Label>
              <Input
                id="book-current"
                type="number"
                inputMode="numeric"
                min={0}
                value={currentPage}
                onChange={(e) => setCurrentPage(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="book-status">{t("addBook.status")}</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BookStatus)} disabled={isFuture}>
              <SelectTrigger id="book-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_KEY) as BookStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(STATUS_KEY[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="book-category">{t("addBook.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="book-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.icon} {lang === "ar" ? c.ar : c.en}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>{t("addBook.bookTitle")}</Label>
            <div className="flex flex-wrap gap-2">
              {COVER_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={color}
                  onClick={() => setCoverColor(color)}
                  className={
                    "h-8 w-8 rounded-full border-2 transition-transform " +
                    (coverColor === color ? "border-foreground scale-110" : "border-transparent")
                  }
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <Label htmlFor="book-future" className="text-sm font-normal">
              {t("addBook.shelfNext")}
            </Label>
            <Switch id="book-future" checked={isFuture} onCheckedChange={setIsFuture} />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button className="w-full" onClick={submit} disabled={busy}>
            {t("addBook.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
