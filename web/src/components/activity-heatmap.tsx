"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils";
import type { DayStat } from "@/data/types";

/**
 * GitHub-style contribution grid for the last N days.
 *
 * Sized for a phone first: 7 columns that reflow into a scrolling row of weeks
 * only when there is room, so it never forces a horizontal scroll on a 320px
 * screen. Intensity is bucketed from the busiest day, not an absolute scale, so
 * a light reader still sees contrast.
 */
export function ActivityHeatmap({ days }: { days: DayStat[] }) {
  const { t } = useI18n();

  const max = useMemo(() => Math.max(1, ...days.map((d) => d.minutes)), [days]);

  const level = (minutes: number) => {
    if (minutes <= 0) return 0;
    const ratio = minutes / max;
    if (ratio > 0.66) return 3;
    if (ratio > 0.33) return 2;
    return 1;
  };

  const tone = [
    "bg-muted",
    "bg-primary/25",
    "bg-primary/55",
    "bg-primary",
  ];

  return (
    <div>
      <div
        className="grid grid-flow-col grid-rows-7 gap-1"
        style={{ gridAutoColumns: "minmax(0, 1fr)" }}
        role="img"
        aria-label={t("home.activity")}
      >
        {days.map((d) => (
          <span
            key={d.date}
            title={`${d.date} · ${d.minutes}m`}
            className={cn("aspect-square w-full rounded-[3px]", tone[level(d.minutes)])}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        <span>{t("common.less")}</span>
        {tone.map((c) => (
          <span key={c} className={cn("h-3 w-3 rounded-[3px]", c)} />
        ))}
        <span>{t("common.more")}</span>
      </div>
    </div>
  );
}
