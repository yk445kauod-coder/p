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
  accent,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Draws a short tinted rule beside the title, to group a screen visually. */
  accent?: "amber" | "teal" | "violet" | "rose" | "indigo";
}) {
  const rule = {
    amber: "bg-primary",
    teal: "bg-teal",
    violet: "bg-violet",
    rose: "bg-rose",
    indigo: "bg-indigo",
  }[accent ?? "amber"];

  return (
    <section className={cn("mt-6", className)}>
      {title || action ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight">
              {accent ? <span className={cn("h-4 w-1 rounded-full", rule)} aria-hidden /> : null}
              {title}
            </h2>
          ) : null}
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

/** Accent names shared by the tinted blocks below. */
export type Accent = "amber" | "teal" | "violet" | "rose" | "indigo";

const TILE: Record<Accent, { icon: string; value: string; ring: string }> = {
  amber: { icon: "bg-primary-soft text-primary-strong", value: "text-primary-strong", ring: "border-primary/20" },
  teal: { icon: "bg-teal-soft text-teal-strong", value: "text-teal-strong", ring: "border-teal/20" },
  violet: { icon: "bg-violet-soft text-violet-strong", value: "text-violet-strong", ring: "border-violet/20" },
  rose: { icon: "bg-rose-soft text-rose-strong", value: "text-rose-strong", ring: "border-rose/20" },
  indigo: { icon: "bg-indigo-soft text-indigo-strong", value: "text-indigo-strong", ring: "border-indigo/20" },
};

/**
 * A metric tile with its own accent.
 *
 * Using a different accent per tile is what makes a stat row readable at a
 * glance instead of a wall of identical boxes.
 */
export function StatTile({
  icon,
  label,
  value,
  accent = "amber",
}: {
  icon: string;
  label: string;
  value: string;
  accent?: Accent;
}) {
  const t = TILE[accent];
  return (
    <div className={cn("surface flex flex-col items-center gap-1.5 px-3 py-4 text-center", t.ring)}>
      <span className={cn("grid h-9 w-9 place-items-center rounded-xl text-base", t.icon)} aria-hidden>
        {icon}
      </span>
      <span className={cn("text-xl font-bold tabular-nums", t.value)}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
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
