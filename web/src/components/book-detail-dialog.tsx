"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Book, BookStatus } from "@/data/types";
import type { TranslationKey } from "@/i18n";

const STATUS_KEY: Record<BookStatus, TranslationKey> = {
  reading: "library.status.reading",
  finished: "library.status.finished",
  wishlist: "library.status.wishlist",
  paused: "library.status.paused",
};

/** Book detail: progress, status and page position, editable in place. */
export function BookDetailDialog({ book, onClose }: { book: Book | null; onClose: () => void }) {
  const { t } = useI18n();
  const { updateBook, deleteBook } = useData();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!book) return null;

  const pct = book.totalPages > 0 ? Math.min(100, (book.currentPage / book.totalPages) * 100) : 0;

  return (
    <Dialog open={Boolean(book)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="pr-6">{book.title}</DialogTitle>
          <DialogDescription>{book.author ?? t("common.unknownAuthor")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="tabular-nums text-muted-foreground">
                {book.currentPage} / {book.totalPages}
              </span>
              <span className="tabular-nums font-medium">{Math.round(pct)}%</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="detail-status">{t("addBook.status")}</Label>
            <Select
              value={book.status}
              onValueChange={(v) => void updateBook(book.id, { status: v as BookStatus })}
            >
              <SelectTrigger id="detail-status">
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

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="detail-current">{t("addBook.currentPage")}</Label>
              <Input
                id="detail-current"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={book.currentPage}
                onBlur={(e) =>
                  void updateBook(book.id, { currentPage: Math.max(0, Math.round(Number(e.target.value) || 0)) })
                }
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="detail-total">{t("addBook.totalPages")}</Label>
              <Input
                id="detail-total"
                type="number"
                inputMode="numeric"
                min={0}
                defaultValue={book.totalPages}
                onBlur={(e) =>
                  void updateBook(book.id, { totalPages: Math.max(0, Math.round(Number(e.target.value) || 0)) })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            onClick={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              await deleteBook(book.id);
              toast.success(t("common.delete"), { icon: "🗑️" });
              setConfirmDelete(false);
              onClose();
            }}
          >
            <Trash2 className="mr-1.5 h-4 w-4" aria-hidden />
            {confirmDelete ? t("profile.eraseConfirm") : t("common.delete")}
          </Button>
          <Button className="w-full" onClick={onClose}>
            {t("common.done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
