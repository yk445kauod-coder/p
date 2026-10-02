import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic } from "next/font/google";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/i18n/provider";
import { AppProviders } from "@/store/providers";
import "./globals.css";

/**
 * IBM Plex Sans for Latin, IBM Plex Sans Arabic for Arabic.
 *
 * They are the same superfamily, so mixed en/ar copy sits on one rhythm and the
 * same weight scale — which matters because the two languages share a layout.
 * Google Fonts serves them as static cuts rather than variables, so every weight
 * the UI actually uses has to be listed explicitly.
 */
const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-latin",
  display: "swap",
});

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TraceBook — turn reading into a habit you can see",
  description:
    "Track reading sessions, streaks, stats, quotes and goals with an AI reading coach. Installable, works offline, free to start.",
  manifest: "/manifest.webmanifest",
  applicationName: "TraceBook",
  // Next generates the tab icon from src/app/favicon.ico; these are the explicit
  // sizes so a browser and an iOS home screen both pick a crisp one.
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon-32.png",
    apple: "/apple-touch-icon.png",
  },
  // `appleWebApp` emits the modern `mobile-web-app-capable` plus the Apple
  // variants, which is what iOS actually reads.
  appleWebApp: {
    capable: true,
    title: "TraceBook",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
    // The admin console must never be indexed. It is also gated server-side.
    robots: "noindex, nofollow",
  },
  openGraph: {
    type: "website",
    title: "TraceBook — turn reading into a habit you can see",
    description:
      "Track reading sessions, streaks, stats, quotes and goals with an AI reading coach. Installable, works offline, free to start.",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Fill the notch area; `viewport-fit=cover` is what makes the safe-area
  // insets in globals.css take effect on iOS.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#12100e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${plexSans.variable} ${plexArabic.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <I18nProvider>
            <AppProviders>
              <Suspense>{children}</Suspense>
            </AppProviders>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
