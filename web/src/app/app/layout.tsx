"use client";

import { BottomNav } from "@/components/bottom-nav";

/**
 * App shell for the signed-in surface.
 *
 * Mobile is the primary target: one column, bottom tab bar, and `pb-nav`
 * reserving space for it. From `md` up the tab bar becomes a left rail and the
 * content column is capped so long lines stay readable on a desktop.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-background">
      <BottomNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-nav pt-4 md:max-w-3xl md:px-8 md:pb-10 md:pt-8">
        {children}
      </main>
    </div>
  );
}
