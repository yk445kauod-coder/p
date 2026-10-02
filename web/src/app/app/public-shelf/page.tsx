"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Check, LibraryBig, Plus, Search, Sparkles } from "lucide-react";
import { CATALOG, searchCatalog } from "@/data/catalog";
import { db, newId } from "@/db";
import { useData } from "@/store/data";
import { useI18n } from "@/i18n/provider";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { CatalogBook } from "@/data/types";

const COLOR_CLASS: Record<CatalogBook["color"], string> = {
  amber: "bg-primary",
  teal: "bg-teal",
  violet: "bg-violet",
  rose: "bg-rose",
  indigo: "bg-indigo",
};

export default function PublicShelfPage() {
  const { lang } = useI18n();
  const { books } = useData();
  const [query, setQuery] = useState("");
  const [language, setLanguage] = useState<"all" | "en" | "ar">("all");
  const results = useMemo(() => searchCatalog(query, CATALOG).filter((book) => language === "all" || book.lang === language), [language, query]);
  const added = new Set(books.map((book) => book.catalogId).filter(Boolean));
  async function addToShelf(book: CatalogBook) { if (added.has(book.id)) return; await db.books.add({ id: newId(), created: new Date(), updated: new Date(), title: book.title, author: book.author, totalPages: book.pages, currentPage: 0, status: "wishlist", coverColor: `hsl(var(--${book.color}))`, category: book.category, isFuture: false, catalogId: book.id, readUrl: book.readUrl, downloadUrl: book.downloadUrl, coverUrl: book.coverUrl, tags: book.tags, rating: null }); }
  return <div className="space-y-6"><PageHeader title="Public Shelf" subtitle={lang === "ar" ? "كتب قانونية مجانية جاهزة للقراءة" : "A growing shelf of legal, free-to-read books"} accent="teal" right={<Button variant="outline" className="rounded-full" onClick={() => window.location.assign("/app/library")}><LibraryBig className="me-2 h-4 w-4" />My Shelf</Button>} /><Card className="bg-mint border-teal/20"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 text-teal-strong"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-widest">{lang === "ar" ? "رف عام موثوق" : "Curated public shelf"}</span></div><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{lang === "ar" ? "كل رابط هنا يذهب لمصدر قانوني مثل Project Gutenberg أو هنداوي. لا نضيف نسخاً مقرصنة أو روابط دفع مضللة." : "Every link goes to a legal source such as Project Gutenberg or Hindawi. No pirated copies, dead links, or misleading paywalls."}</p></div><div className="text-end text-sm font-semibold text-teal-strong">{CATALOG.length} books</div></CardContent></Card><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === "ar" ? "ابحث بالعنوان أو المؤلف أو التاج" : "Search title, author, or tag"} className="ps-9" /></div><div className="flex gap-2"><Button variant={language === "all" ? "default" : "outline"} onClick={() => setLanguage("all")}>All</Button><Button variant={language === "en" ? "default" : "outline"} onClick={() => setLanguage("en")}>English</Button><Button variant={language === "ar" ? "default" : "outline"} onClick={() => setLanguage("ar")}>العربية</Button></div></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{results.map((book) => <Card key={book.id} className="surface-hover overflow-hidden"><CardContent className="p-0"><div className={`h-2 ${COLOR_CLASS[book.color]}`} /><div className="p-5"><div className="flex items-start justify-between gap-3"><div className={`grid h-12 w-10 place-items-center rounded-lg ${COLOR_CLASS[book.color]} text-lg font-bold text-white`}>{book.title.slice(0, 1)}</div><Badge variant={book.lang === "ar" ? "teal" : "secondary"}>{book.lang === "ar" ? "عربي" : "EN"}</Badge></div><h2 className="mt-4 line-clamp-2 font-bold">{book.title}</h2><p className="mt-1 text-sm text-muted-foreground">{book.author} · {book.pages} pages</p><p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{book.description}</p><div className="mt-4 flex gap-2"><Button size="sm" className="flex-1" onClick={() => void addToShelf(book)} disabled={added.has(book.id)}>{added.has(book.id) ? <><Check className="me-1.5 h-4 w-4" />{lang === "ar" ? "اتضاف" : "Added"}</> : <><Plus className="me-1.5 h-4 w-4" />{lang === "ar" ? "أضف لـ My Shelf" : "Add to My Shelf"}</>}</Button><Button size="sm" variant="outline" asChild><a href={book.readUrl} target="_blank" rel="noreferrer"><BookOpen className="me-1.5 h-4 w-4" />Read<ArrowUpRight className="ms-1 h-3 w-3" /></a></Button></div></div></CardContent></Card>)}</div>{results.length === 0 && <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">{lang === "ar" ? "لا يوجد كتاب مطابق للبحث." : "No books match that search."}</div>}</div>;
}
