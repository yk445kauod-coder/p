"use client";

import { useEffect, useState } from "react";
import { BookOpenCheck, Check, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { useData } from "@/store/data";
import { useI18n } from "@/i18n/provider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function LogSessionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, lang } = useI18n();
  const { books, logSession } = useData();
  const reading = books.filter((b) => b.status === "reading" || b.status === "paused");
  const firstReadingId = reading[0]?.id;
  const [minutes, setMinutes] = useState(25);
  const [pages, setPages] = useState(10);
  const [bookId, setBookId] = useState("none");
  const [note, setNote] = useState("");
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setMinutes(25); setPages(10); setBookId(firstReadingId ?? "none"); setNote(""); setApplied(false); } }, [open, firstReadingId]);
  const selectedBook = reading.find((book) => book.id === bookId);
  const nextPage = selectedBook ? Math.min(selectedBook.totalPages || Infinity, selectedBook.currentPage + pages) : pages;
  const progress = selectedBook?.totalPages ? Math.min(100, Math.round((nextPage / selectedBook.totalPages) * 100)) : null;
  async function submit() {
    if (!Number.isFinite(minutes) || minutes <= 0) { toast.error(t("log.minutesRequired")); return; }
    setBusy(true);
    try { await logSession({ bookId: bookId === "none" ? null : bookId, minutes, pagesRead: Math.max(0, pages), note: note.trim() || null, appliedYesterday: applied }); toast.success(t("log.saved"), { icon: "📚" }); onOpenChange(false); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="skeuo-surface max-h-[92dvh] overflow-y-auto sm:max-w-lg"><DialogHeader><div className="mb-2 grid h-12 w-12 place-items-center rounded-2xl bg-teal-soft text-teal-strong"><BookOpenCheck className="h-6 w-6" /></div><DialogTitle>{t("log.title")}</DialogTitle><DialogDescription>{lang === "ar" ? "سجّل اللي حصل فعلاً، والتقدم هيتحدث تلقائيًا." : "Record what actually happened and your progress updates automatically."}</DialogDescription></DialogHeader><div className="grid gap-5"><div className="grid gap-2"><Label htmlFor="log-book">{t("log.book")}</Label><Select value={bookId} onValueChange={setBookId}><SelectTrigger id="log-book" className="skeuo-control h-12"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">{t("log.noBook")}</SelectItem>{reading.map((book) => <SelectItem key={book.id} value={book.id}>{book.title}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-3"><Stepper label={t("log.minutes")} value={minutes} min={1} step={5} onChange={setMinutes} suffix="min" /><Stepper label={t("log.pages")} value={pages} min={0} step={1} onChange={setPages} suffix={lang === "ar" ? "صفحة" : "pages"} /></div><div className="flex flex-wrap gap-2"><span className="self-center text-xs text-muted-foreground">{lang === "ar" ? "اختيارات سريعة" : "Quick set"}</span>{[10, 20, 30, 45, 60].map((value) => <button key={value} type="button" onClick={() => setMinutes(value)} className={cn("skeuo-control rounded-full border px-3 py-1.5 text-xs font-semibold", minutes === value && "border-primary bg-primary-soft text-primary-strong")}>{value}m</button>)}</div>{selectedBook && <div className="skeuo-surface rounded-xl p-4"><div className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-semibold">{selectedBook.title}</span><span className="tnum font-bold text-teal-strong">{progress === null ? `${nextPage}p` : `${progress}%`}</span></div><div className="mt-3 h-3 overflow-hidden rounded-full bg-black/10 shadow-inner"><div className="h-full rounded-full bg-teal transition-[width] duration-300" style={{ width: `${progress ?? 0}%` }} /></div><p className="mt-2 text-xs text-muted-foreground">{lang === "ar" ? `هتوصل للصفحة ${nextPage} بعد الجلسة` : `You’ll reach page ${nextPage} after this session`}</p></div>}<div className="grid gap-2"><Label htmlFor="log-note">{lang === "ar" ? "إيه اللي اتعلمته؟" : "What did you learn?"}</Label><Textarea id="log-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={lang === "ar" ? "اكتب ملخص بسيط من غير أي رموز…" : "Write a simple takeaway — no markup needed"} rows={4} className="skeuo-control" /></div><div className="skeuo-control flex items-center justify-between gap-3 rounded-xl border p-4"><div><Label htmlFor="log-applied" className="text-sm font-semibold">{t("log.applied")}</Label><p className="mt-1 text-xs text-muted-foreground">{lang === "ar" ? "يساعدك تتابع الـPrime والاستمرارية" : "Helps track Prime and consistency"}</p></div><Switch id="log-applied" checked={applied} onCheckedChange={setApplied} /></div></div><DialogFooter className="mt-2"><Button className="skeuo-control w-full" onClick={() => void submit()} disabled={busy}><Check className="me-2 h-4 w-4" />{busy ? t("common.loading") : t("log.save")}</Button></DialogFooter></DialogContent></Dialog>;
}
function Stepper({ label, value, min, step, suffix, onChange }: { label: string; value: number; min: number; step: number; suffix: string; onChange: (value: number) => void }) { return <div className="grid gap-2"><Label>{label}</Label><div className="skeuo-control flex h-14 items-center gap-2 rounded-xl border p-2"><button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border bg-muted hover:bg-accent" onClick={() => onChange(Math.max(min, value - step))} aria-label={`Decrease ${label}`}><Minus className="h-4 w-4" /></button><Input type="number" min={min} value={value} onChange={(e) => onChange(Math.max(min, Math.round(Number(e.target.value) || min)))} className="h-10 border-0 bg-transparent text-center text-lg font-bold shadow-none focus-visible:ring-0" /><button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border bg-primary-soft text-primary-strong hover:bg-primary/20" onClick={() => onChange(value + step)} aria-label={`Increase ${label}`}><Plus className="h-4 w-4" /></button><span className="shrink-0 text-[11px] text-muted-foreground">{suffix}</span></div></div>; }
