"use client";

import { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { BrainCircuit, FileText, Network, Plus, Search, Sparkles, Tag, X } from "lucide-react";
import { db, newId } from "@/db";
import { buildGraph, parseWikiLinks } from "@/lib/wiki";
import type { Note } from "@/data/types";
import { useI18n } from "@/i18n/provider";
import { PageHeader, Section } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function NotesPage() {
  const { lang } = useI18n();
  const notes = useLiveQuery(() => db.notes.orderBy("updated").reverse().toArray(), [], []) ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<Note | null>(null);
  const [view, setView] = useState<"notes" | "graph">("notes");
  const selected = draft ?? notes.find((note) => note.id === selectedId) ?? notes[0] ?? null;
  const graph = useMemo(() => buildGraph(notes), [notes]);
  const filtered = notes.filter((note) => {
    const haystack = `${note.title} ${note.body} ${note.tags.join(" ")}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  function openNote(note: Note) {
    setSelectedId(note.id);
    setDraft(note);
  }
  async function createNote() {
    const now = new Date();
    const note: Note = { id: newId(), created: now, updated: now, title: lang === "ar" ? "ملاحظة جديدة" : "Untitled note", body: "", bookId: null, tags: [], pinned: false };
    await db.notes.add(note);
    setSelectedId(note.id);
    setDraft(note);
  }
  async function saveDraft() {
    if (!draft) return;
    const clean = { ...draft, title: draft.title.trim() || (lang === "ar" ? "ملاحظة بدون عنوان" : "Untitled note"), updated: new Date() };
    await db.notes.put(clean);
    setDraft(clean);
  }
  async function deleteDraft() {
    if (!draft) return;
    await db.notes.delete(draft.id);
    setDraft(null);
    setSelectedId(null);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={lang === "ar" ? "مساحة المعرفة" : "Knowledge workspace"}
        subtitle={lang === "ar" ? "ملاحظاتك، روابطك، وخريطة الأفكار في مكان واحد" : "Notes, links, and your reading graph in one place"}
        accent="indigo"
        right={<Button onClick={() => void createNote()} className="rounded-full"><Plus className="me-2 h-4 w-4" />{lang === "ar" ? "ملاحظة جديدة" : "New note"}</Button>}
      />
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_280px]">
        <Card className="glass-panel h-fit overflow-hidden">
          <CardContent className="p-3">
            <div className="relative mb-3"><Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={lang === "ar" ? "ابحث في ملاحظاتك" : "Search your notes"} className="ps-9" /></div>
            <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
              <button onClick={() => setView("notes")} className={cn("rounded-lg px-2 py-2 text-xs font-medium", view === "notes" && "bg-card shadow-sm")}>{lang === "ar" ? "الملاحظات" : "Notes"}</button>
              <button onClick={() => setView("graph")} className={cn("rounded-lg px-2 py-2 text-xs font-medium", view === "graph" && "bg-card shadow-sm")}>{lang === "ar" ? "الخريطة" : "Graph"}</button>
            </div>
            <div className="space-y-1">
              {filtered.map((note) => <button key={note.id} onClick={() => openNote(note)} className={cn("w-full rounded-xl p-3 text-start transition-colors hover:bg-accent", selected?.id === note.id && "bg-indigo-soft text-indigo-strong")}><div className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate text-sm font-semibold">{note.title || (lang === "ar" ? "بدون عنوان" : "Untitled")}</span></div><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{note.body || (lang === "ar" ? "ابدأ بكتابة فكرة…" : "Start writing an idea…")}</p></button>)}
              {filtered.length === 0 && <div className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">{lang === "ar" ? "لا توجد ملاحظات بعد" : "No notes yet"}</div>}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel min-h-[520px] overflow-hidden">
          {view === "graph" ? <GraphCanvas graph={graph} lang={lang} /> : selected ? <CardContent className="p-5 sm:p-7"><div className="mb-5 flex items-center justify-between gap-3"><div><Badge variant="indigo" className="mb-2">{lang === "ar" ? "ملاحظة مرتبطة" : "Linked note"}</Badge><Input value={selected.title} onChange={(e) => setDraft({ ...selected, title: e.target.value })} className="h-auto border-0 bg-transparent px-0 text-2xl font-bold shadow-none focus-visible:ring-0" /></div><Button variant="ghost" size="icon" onClick={() => setDraft(null)} aria-label="Close"><X className="h-4 w-4" /></Button></div><Textarea value={selected.body} onChange={(e) => setDraft({ ...selected, body: e.target.value })} placeholder={lang === "ar" ? "اكتب بالـ Markdown… استخدم [[اسم الملاحظة]] لصنع رابط" : "Write in Markdown… use [[Note title]] to create a link"} className="min-h-[330px] resize-none border-0 bg-muted/35 p-4 font-mono text-sm leading-7 focus-visible:ring-1" /><div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><Network className="h-4 w-4 text-indigo" />{parseWikiLinks(selected.body).length} {lang === "ar" ? "روابط داخلية" : "internal links"}<span className="mx-1">·</span><Tag className="h-4 w-4" />{selected.tags.length || 0} tags</div><div className="mt-6 flex justify-between gap-2"><Button variant="ghost" className="text-destructive" onClick={() => void deleteDraft()}>{lang === "ar" ? "حذف" : "Delete"}</Button><Button onClick={() => void saveDraft()}><Sparkles className="me-2 h-4 w-4" />{lang === "ar" ? "حفظ الملاحظة" : "Save note"}</Button></div></CardContent> : <CardContent className="grid min-h-[520px] place-items-center p-8 text-center"><div><BrainCircuit className="mx-auto h-12 w-12 text-indigo/70" /><h2 className="mt-4 text-lg font-semibold">{lang === "ar" ? "ابنِ شبكة أفكارك" : "Build your thinking network"}</h2><p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">{lang === "ar" ? "اربط الكتب بالملاحظات باستخدام [[روابط ويكي]] وشاهد الأفكار وهي تتصل." : "Connect books and ideas with [[wiki links]] and watch your knowledge graph grow."}</p><Button className="mt-5" onClick={() => void createNote()}><Plus className="me-2 h-4 w-4" />{lang === "ar" ? "ابدأ بملاحظة" : "Start a note"}</Button></div></CardContent>}
        </Card>

        <div className="space-y-4"><Card className="bg-coach border-indigo/20"><CardContent className="p-5"><div className="flex items-center gap-2 text-indigo-strong"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-widest">{lang === "ar" ? "مساعد المعرفة" : "Knowledge copilot"}</span></div><h3 className="mt-3 text-lg font-bold">{lang === "ar" ? "حوّل القراءة إلى نظام أفكار" : "Turn reading into a system"}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{lang === "ar" ? "استخرج الأفكار، اكتب ملخصات، واكتشف الروابط المخفية بين كتبك." : "Extract ideas, write summaries, and discover hidden links across your reading."}</p><Button variant="secondary" className="mt-4 w-full" onClick={() => setView("graph")}>{lang === "ar" ? "استكشف الخريطة" : "Explore graph"}</Button></CardContent></Card><Section title={lang === "ar" ? "ملخص سريع" : "Quick stats"} accent="teal"><div className="grid grid-cols-2 gap-3"><MiniMetric label={lang === "ar" ? "ملاحظة" : "Notes"} value={notes.length} /><MiniMetric label={lang === "ar" ? "روابط" : "Links"} value={graph.links.length} /></div></Section></div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) { return <div className="surface p-4"><div className="text-2xl font-bold tnum">{value}</div><div className="mt-1 text-xs text-muted-foreground">{label}</div></div>; }
function GraphCanvas({ graph, lang }: { graph: ReturnType<typeof buildGraph>; lang: "en" | "ar" }) { const nodes = graph.nodes.slice(0, 18); return <CardContent className="p-5"><div className="mb-5 flex items-center justify-between"><div><Badge variant="indigo">{lang === "ar" ? "خريطة المعرفة" : "Knowledge graph"}</Badge><h2 className="mt-2 text-xl font-bold">{lang === "ar" ? "كيف تتصل أفكارك؟" : "How your ideas connect"}</h2></div><Network className="h-6 w-6 text-indigo" /></div><div className="graph-stage relative min-h-[420px] overflow-hidden rounded-2xl border bg-muted/30">{nodes.map((node, i) => { const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2; const x = 50 + Math.cos(angle) * (25 + (i % 3) * 7); const y = 50 + Math.sin(angle) * (25 + (i % 2) * 8); return <div key={node.id} className={cn("graph-node absolute -translate-x-1/2 -translate-y-1/2 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm", node.ghost ? "border-dashed bg-muted text-muted-foreground" : "border-indigo/30 bg-card text-indigo-strong")} style={{ left: `${x}%`, top: `${y}%` }} title={`${node.degree} connections`}>{node.label}</div>; })}<div className="absolute left-1/2 top-1/2 grid h-20 w-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-indigo text-center text-xs font-bold text-white shadow-float">{lang === "ar" ? "أفكارك" : "Your ideas"}</div></div><p className="mt-3 text-xs text-muted-foreground">{lang === "ar" ? "استخدم [[اسم الملاحظة]] داخل أي ملاحظة لصناعة اتصال جديد." : "Use [[Note title]] inside any note to create a new connection."}</p></CardContent>; }
