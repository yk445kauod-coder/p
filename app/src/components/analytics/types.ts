/**
 * Shared shapes for the analytics charts.
 *
 * Both the Nivo (web) and react-native-svg (native) implementations render from
 * these, so a screen can swap implementations without touching its data.
 */

/** One day of activity, keyed by ISO `YYYY-MM-DD`. */
export interface CalendarDatum {
  day: string;
  /** Pages read that day — drives the colour ramp. */
  value: number;
}

export interface GenreDatum {
  /** Category id from `domain/achievements` (e.g. `fiction`). */
  id: string;
  /** Pages read in this genre; the chart derives percentages from it. */
  value: number;
  /** Overrides the label resolved from the category table. */
  label?: string;
}

export interface MonthlyDatum {
  /** ISO month key, `YYYY-MM`. */
  month: string;
  pages: number;
  books: number;
}

export type MonthlyMetric = "pages" | "books";
