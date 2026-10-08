"use client";

import { useMemo, useState } from "react";
import { ArrowUp, Bot, BrainCircuit, Check, Clock3, Loader2, Sparkles, Wand2 } from "lucide-react";
import { useData } from "@/store/data";
import { useAuth } from "@/store/auth";
import { supabase } from "@/lib/supabase";
import { useI18n } from "@/i18n/provider";
import { PageHeader } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Message { role: "user" | "assistant"; text: string; toolCalls?: string[]; }

export default function CoachPage() {
  const { lang } = useI18n();
  const { stats, books, sessions, dailyEntries, preferences, ready } = useData();
  const { reader, cloudAvailable } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = lang === "ar"
    ? ["حلّل نمط قرايتي في آخر ٣٠ يوم", "اعملي خطة للكتاب الحالي", "إيه الكتاب المناسب بعد كده؟", "سجّل إني قريت ١٠ صفحات النهارده"]
    : ["Analyse my last 30 days", "Build a plan for my current book", "What should I read next?", "Log that I read 10 pages today"];
  const localSnapshot = useMemo(() => JSON.stringify({
    streak: stats.streak,
    bestStreak: stats.bestStreak,
    totalMinutes: stats.totalMinutes,
    weekMinutes: stats.weekMinutes,
    totalPages: stats.totalPages,
    dailyGoalMinutes: preferences.dailyGoalMinutes,
    dailyPagesGoal: preferences.dailyPagesGoal,
    books: books.map((b) => ({ id: b.id, title: b.title, author: b.author, status: b.status, currentPage: b.currentPage, totalPages: b.totalPages })),
    sessions: sessions.slice(-20).map((s) => ({ day: s.day, minutes: s.minutes, pagesRead: s.pagesRead, bookId: s.bookId, note: s.note })),
    dailyEntries: dailyEntries.slice(-14).map((e) => ({ day: e.day, summary: e.summary, essence: e.essence, bookId: e.bookId })),
  }), [books, dailyEntries, preferences.dailyGoalMinutes, preferences.dailyPagesGoal, sessions, stats]);

  async function ask(value: string) {
    const text = value.trim();
    if (!text || busy) return;
    setPrompt("");
    setError(null);
    setMessages((current) => [...current, { role: "user", text }]);
    setBusy(true);
    try {
      const history = [...messages, { role: "user" as const, text }].slice(-12).map((m) => ({ role: m.role, content: m.text }));
      let data: { content?: string; error?: string; toolCalls?: { name?: string }[] } | null = null;
      if (supabase && cloudAvailable && reader) {
        const result = await supabase.functions.invoke("agent", { body: { messages: history, context: localSnapshot, allowActions: true, stream: false } });
        if (result.error) throw result.error;
        data = result.data;
      } else {
        const result = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: history, context: localSnapshot }) });
        data = await result.json();
        if (!result.ok) throw new Error(data?.error ?? `http_${result.status}`);
      }
      if (!data?.content) throw new Error(data?.error ?? "empty_ai_response");
      const content = data.content;
      const tools: string[] = Array.isArray(data.toolCalls) ? data.toolCalls.map((call: { name?: string }) => call.name).filter((name): name is string => Boolean(name)) : [];
      setMessages((current) => [...current, { role: "assistant", text: content, toolCalls: tools }]);
    } catch (cause) {
      setError(lang === "ar" ? `حصل خطأ أثناء اتصال فهم: ${(cause as Error).message}` : `Fahm could not complete that request: ${(cause as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <div className="grid min-h-[60dvh] place-items-center text-sm text-muted-foreground">{lang === "ar" ? "جاري التحميل…" : "Loading…"}</div>;
  return <div className="space-y-6">
    <PageHeader title={lang === "ar" ? "فهم — مدربك الحقيقي" : "Fahm — your real reading coach"} subtitle={lang === "ar" ? "وكيل يقرأ بياناتك ويستعمل أدواته قبل ما يرد" : "An agent that reads your data and uses tools before answering"} accent="indigo" right={<Badge variant="indigo">{preferences.plan === "pro" ? "PRO" : "CONNECTED"}</Badge>} />
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="skeuo-surface overflow-hidden">
        <div className="border-b border-indigo/15 bg-coach p-5 sm:p-7"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo text-white shadow-lift"><Bot className="h-5 w-5" /></div><div><div className="flex items-center gap-2"><h2 className="font-bold">{lang === "ar" ? "جلسة فهم" : "Fahm session"}</h2><span className={`h-2 w-2 rounded-full ${busy ? "animate-pulse bg-primary" : "bg-success"}`} /></div><p className="text-xs text-muted-foreground">{reader ? (lang === "ar" ? "متصل ببياناتك السحابية" : "Connected to your cloud data") : (lang === "ar" ? "وضع الضيف — لا يوجد رد وهمي" : "Guest mode — no fake answers")}</p></div></div><p className="mt-6 max-w-2xl text-lg font-semibold leading-relaxed">{lang === "ar" ? "اسأل سؤالًا طبيعيًا. فهم يقدر يحلّل، يخطّط، يسجّل جلسة، يضيف كتاب، ويشرح لك ليه اقترح حاجة." : "Ask naturally. Fahm can analyse, plan, log a session, add a book, and explain why it suggested something."}</p></div>
        <CardContent className="p-5 sm:p-7"><div className="space-y-4">{messages.length === 0 ? <div className="rounded-2xl border border-dashed p-5 text-center"><BrainCircuit className="mx-auto h-9 w-9 text-indigo" /><p className="mt-3 text-sm font-medium">{lang === "ar" ? "ابدأ بسؤال عن قرايتك" : "Start with a real reading question"}</p><p className="mt-1 text-xs text-muted-foreground">{lang === "ar" ? "مفيش إجابات محفوظة أو if/else هنا — الطلب يروح للـagent المتصل ببياناتك." : "No canned if/else answers — the request goes to the data-aware agent."}</p></div> : messages.map((message, index) => <div key={`${message.role}-${index}`} className={message.role === "user" ? "ms-auto max-w-[88%] rounded-2xl rounded-ee-md bg-indigo px-4 py-3 text-sm text-white" : "max-w-[92%] rounded-2xl rounded-es-md bg-muted px-4 py-3 text-sm leading-relaxed"}><div>{message.text}</div>{message.toolCalls?.length ? <div className="mt-3 flex flex-wrap gap-1.5 border-t border-current/10 pt-2 text-[11px] opacity-75">{message.toolCalls.map((tool) => <span key={tool} className="rounded-full bg-background/40 px-2 py-1">{tool}</span>)}</div> : null}</div>)}</div>
          {error ? <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive-soft p-3 text-xs leading-relaxed text-destructive">{error}</div> : null}
          <div className="mt-6 flex flex-wrap gap-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => void ask(suggestion)} disabled={busy} className="skeuo-control rounded-full border px-3 py-2 text-xs font-medium transition-colors hover:border-indigo hover:bg-indigo-soft disabled:opacity-50">{suggestion}</button>)}</div>
          <div className="skeuo-control mt-5 rounded-2xl border bg-card p-2"><Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(prompt); } }} placeholder={lang === "ar" ? "اكتب سؤالك بالعادي…" : "Ask Fahm in plain language…"} className="min-h-[76px] resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" /><div className="flex items-center justify-between gap-2 px-2 pb-1"><span className="text-[11px] text-muted-foreground">{lang === "ar" ? "اكتب بالعربي الطبيعي — من غير علامات أو كود" : "Plain language — no markup or code"}</span><Button size="icon" className="rounded-xl" onClick={() => void ask(prompt)} disabled={busy || !prompt.trim()} aria-label="Send">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}</Button></div></div>
        </CardContent>
      </Card>
      <div className="space-y-4"><Card className="skeuo-surface bg-streak border-primary/20"><CardContent className="p-5"><div className="flex items-center gap-2 text-primary-strong"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-widest">{lang === "ar" ? "بيانات متاحة للوكيل" : "Agent context"}</span></div><p className="mt-3 text-sm leading-relaxed">{books.length} {lang === "ar" ? "كتب" : "books"} · {sessions.length} {lang === "ar" ? "جلسات" : "sessions"} · {dailyEntries.length} {lang === "ar" ? "ملخصات" : "journal entries"}</p></CardContent></Card><Card className="skeuo-surface"><CardContent className="p-5"><div className="flex items-center gap-2"><Wand2 className="h-4 w-4 text-violet" /><h3 className="font-semibold">{lang === "ar" ? "أفعال حقيقية" : "Real actions"}</h3></div><ul className="mt-4 space-y-3 text-sm text-muted-foreground"><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{lang === "ar" ? "يقرأ الإحصائيات والكتب" : "Reads stats and books"}</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{lang === "ar" ? "يسجل جلسة أو يضيف كتابًا" : "Logs sessions or adds books"}</li><li className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-success" />{lang === "ar" ? "يعرض الأدوات التي استخدمها" : "Shows the tools it used"}</li></ul></CardContent></Card><div className="grid grid-cols-2 gap-3"><div className="skeuo-surface p-4"><Clock3 className="h-4 w-4 text-teal" /><div className="mt-2 text-xl font-bold tnum">{stats.avgMinutes}m</div><div className="text-xs text-muted-foreground">{lang === "ar" ? "متوسط الجلسة" : "Avg. session"}</div></div><div className="skeuo-surface p-4"><Sparkles className="h-4 w-4 text-primary" /><div className="mt-2 text-xl font-bold tnum">{books.length}</div><div className="text-xs text-muted-foreground">{lang === "ar" ? "كتاب" : "Books"}</div></div></div></div>
    </div>
  </div>;
}
