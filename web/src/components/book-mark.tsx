import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The TraceBook mark.
 *
 * The same vector that produces the favicon and the PWA icons, so the in-app
 * logo and the home-screen icon are never out of sync. Rendered as an <img>
 * rather than an inline SVG on purpose: the browser then caches one asset and
 * the mark stays a single source of truth in `public/brand/book-mark.svg`.
 */
export function BookMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/brand/book-mark.svg"
      alt=""
      width={size}
      height={size}
      // Decorative next to the wordmark, which carries the accessible name.
      aria-hidden
      className={cn("shrink-0 rounded-lg", className)}
      priority
    />
  );
}

/**
 * Mark plus wordmark, the standard lockup for headers and the landing page.
 */
export function Wordmark({
  size = 28,
  className,
  labelClassName,
}: {
  size?: number;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <BookMark size={size} />
      <span className={cn("font-semibold tracking-tight", labelClassName)}>TraceBook</span>
    </span>
  );
}
