import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merges conditional class names, with later Tailwind utilities winning. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** `HH:MM` in 24-hour form. */
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Today as an ISO day key (`YYYY-MM-DD`). */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Formats an ISO day key for display, following the active language. */
export function formatDay(key: string, lang: "en" | "ar"): string {
  return new Date(`${key}T00:00:00Z`).toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Clamps a number into an inclusive range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
