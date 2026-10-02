"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Home, User } from "lucide-react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/i18n";

const TABS: { href: string; key: TranslationKey; Icon: typeof Home }[] = [
  { href: "/app", key: "nav.home", Icon: Home },
  { href: "/app/library", key: "nav.library", Icon: BookOpen },
  { href: "/app/stats", key: "nav.stats", Icon: BarChart3 },
  { href: "/app/profile", key: "nav.profile", Icon: User },
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
        <ul className="mx-auto grid max-w-lg grid-cols-4">
          {TABS.map(({ href, key, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors",
                    active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.4]")} aria-hidden />
                  <span>{t(key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Desktop: left rail. */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border/60 bg-card/40 px-3 py-6 md:flex">
        <Link href="/app" className="mb-8 flex items-center gap-2 px-2 text-lg font-semibold tracking-tight">
          <BookOpen className="h-5 w-5 text-primary" aria-hidden />
          {t("app.name")}
        </Link>
        <ul className="flex flex-col gap-1">
          {TABS.map(({ href, key, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {t(key)}
                </Link>
              </li>
            );
          })}
        </ul>
      </aside>
    </>
  );
}
