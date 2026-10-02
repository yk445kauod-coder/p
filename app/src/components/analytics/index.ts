/**
 * Analytics charts.
 *
 * Each chart ships two implementations: a Nivo-powered `.web.tsx` for the PWA
 * and a react-native-svg/View fallback for the native build. Importing from this
 * barrel resolves to the right one per platform — screens never branch.
 */
export { ReadingStreakCalendar } from "./ReadingStreakCalendar";
export { GenreDistributionChart } from "./GenreDistributionChart";
export { MonthlyProgressChart } from "./MonthlyProgressChart";
export { ChartEmpty } from "./ChartEmpty";
export { AnalyticsSection } from "./AnalyticsSection";
export * from "./derive";
export type { CalendarDatum, GenreDatum, MonthlyDatum, MonthlyMetric } from "./types";
