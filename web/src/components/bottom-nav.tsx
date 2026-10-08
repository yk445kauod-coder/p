"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, BrainCircuit, FileText, Home, ShieldCheck, User } from "lucide-react";
import { Wordmark } from "@/components/book-mark";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n";

const TABS: { href: string; key: TranslationKey; Icon: typeof Home; active: string }[] = [
  { href: "/app", key: "nav.home", Icon: Home, active: "text-primary" },
  { href: "/app/library", key: "nav.library", Icon: BookOpen, active: "text-teal" },
  { href: "/app/notes", key: "nav.notes", Icon: FileText, active: "text-indigo" },
  { href: "/app/coach", key: "nav.coach", Icon: BrainCircuit, active: "text-violet" },
  { href: "/app/stats", key: "nav.stats", Icon: BarChart3, active: "text-violet" },
  { href: "/app/profile", key: "nav.profile", Icon: User, active: "text-rose" },
];

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app" || pathname === "/app/";
  return pathname.startsWith(href);
}

/**
 * The bottom tab bar.
 *
 * Phones get a fixed bar with 56px targets and a safe-area inset so the iOS
 * home indicator never covers a label; from `md` up the same links render as a
 * left rail, so the layout is thumb-first without wasting desktop space.
 */
export function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <>
      {/* Mobile: fixed bottom tab bar. */}
      <nav
        aria-label={t("nav.home")}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/85 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto grid max-w-lg grid-cols-6">
          {TABS.map(({ href, key, Icon, active }) => {
            const on = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                    on ? active : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", on && "stroke-[2.4]")} aria-hidden />
                  <span>{t(key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop: left rail. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border/60 bg-card/40 px-4 py-6 md:flex">
        <Link href="/app" className="mb-8 flex items-center px-2">
          <Wordmark size={26} labelClassName="text-lg" />
        </Link>
        <div className="mb-4 rounded-2xl bg-coach p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-strong">TraceBook OS</p>
          <p className="mt-2 text-sm font-semibold">Read less. Remember more.</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Your reading workspace, tuned by your habits.</p>
        </div>
        <ul className="flex flex-col gap-1">
          {TABS.map(({ href, key, Icon, active }) => {
            const on = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={on ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    on ? cn("bg-accent", active) : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href="/admin" className="mt-auto flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
          <ShieldCheck className="h-5 w-5" aria-hidden />
          Admin
        </Link>
      </aside>
    </>
  );
}
