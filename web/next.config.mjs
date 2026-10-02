import withPWAInit from "@ducanh2912/next-pwa";

/**
 * TraceBook is local-first: every screen is prerenderable and all data lives in
 * the browser, so the whole app exports statically and ships to Cloudflare
 * Pages. Anything needing a secret (the AI coach, Stripe) belongs in a Supabase
 * edge function rather than a Next API route, so there is no server runtime.
 */
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  customWorkerSrc: "./src/service-worker",
  register: true,
  reloadOnOnline: true,
});

export default withPWA({
  output: "export",
  reactStrictMode: true,
  // `next/image` needs a loader when exporting; the app only uses plain <img>
  // for the favicon, so optimisation stays off.
  images: { unoptimized: true },
  trailingSlash: true,
});
