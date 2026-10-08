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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

/**
 * Log a reading session.
 *
 * Mobile-first: fields stack in one column, the sheet is scrollable so the
 * keyboard never traps the submit button, and the primary action is full width.
 */
export function LogSessionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const { books, logSession } = useData();

  const reading = books.filter((b) => b.status === "reading" || b.status === "paused");

  const [minutes, setMinutes] = useState("25");
  const [pages, setPages] = useState("0");
  const [bookId, setBookId] = useState<string>("none");
  const [note, setNote] = useState("");
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reset to a clean slate each time the sheet opens.
  useEffect(() => {
    if (!open) return;
    setMinutes("25");
    setPages("0");
    setBookId(reading[0]?.id ?? "none");
    setNote("");
    setApplied(false);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const mins = Number(minutes);
    if (!Number.isFinite(mins) || mins <= 0) {
      toast.error(t("log.minutesRequired"));
      return;
    }
    setBusy(true);
    try {
      await logSession({
        bookId: bookId === "none" ? null : bookId,
        minutes: Math.round(mins),
        pagesRead: Math.max(0, Math.round(Number(pages) || 0)),
        note: note.trim() || null,
        appliedYesterday: applied,
      });
      toast.success(t("log.saved"), { icon: "📚" });
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("log.title")}</DialogTitle>
          <DialogDescription className="sr-only">{t("log.title")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="log-minutes">{t("log.minutes")}</Label>
              <Input
                id="log-minutes"
                type="number"
                inputMode="numeric"
                min={1}
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="log-pages">{t("log.pages")}</Label>
              <Input
                id="log-pages"
                type="number"
                inputMode="numeric"
                min={0}
                value={pages}
                onChange={(e) => setPages(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="log-book">{t("log.book")}</Label>
            <Select value={bookId} onValueChange={setBookId}>
              <SelectTrigger id="log-book">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("log.noBook")}</SelectItem>
                {reading.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="log-note">{t("log.note")}</Label>
            <Textarea
              id="log-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("log.notePlaceholder")}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
            <Label htmlFor="log-applied" className="text-sm font-normal">
              {t("log.applied")}
            </Label>
            <Switch id="log-applied" checked={applied} onCheckedChange={setApplied} />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button className="w-full" onClick={submit} disabled={busy}>
            {t("log.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
