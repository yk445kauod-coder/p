"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Small, mobile-first building blocks shared by every screen.
 *
 * These exist so screens compose layout instead of repeating Tailwind chains,
 * and so spacing/type stay consistent from a 320px phone up to a desktop.
 */

/** Page title block. `right` holds an action (usually a button or a chip). */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </header>
  );
}

/** A titled block with consistent vertical rhythm. */
export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-6", className)}>
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? <h2 className="text-base font-semibold tracking-tight">{title}</h2> : null}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/** Compact metric used inside the hero card and stat grids. */
export function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "primary";
}) {
  return (
    <div className="min-w-0">
      <div
        className={cn(
          "truncate text-lg font-bold tabular-nums",
          tone === "primary" ? "text-primary" : "text-foreground",
        )}
      >
        {value}
      </div>
      <div className="truncate text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

/** Friendly empty state: emoji, copy, and an optional action. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: string;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
      <span className="text-3xl" aria-hidden>
        {icon}
      </span>
      <p className="text-sm font-medium">{title}</p>
      {body ? <p className="max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      {action}
    </div>
  );
}
