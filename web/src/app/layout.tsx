import type { Metadata, Viewport } from "next";
import { Inter, Noto_Kufi_Arabic } from "next/font/google";
import { Suspense } from "react";
import { ThemeProvider } from "@/components/theme-provider";
import { I18nProvider } from "@/i18n/provider";
import { AppProviders } from "@/store/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
// Arabic copy renders in a matching geometric sans so mixed en/ar sits on one rhythm.
const kufi = Noto_Kufi_Arabic({ subsets: ["arabic"], variable: "--font-arabic", display: "swap" });

export const metadata: Metadata = {
  title: "TraceBook — turn reading into a habit you can see",
  description:
    "Track reading sessions, streaks, stats, quotes and goals with an AI reading coach. Installable, works offline, free to start.",
  manifest: "/manifest.webmanifest",
  applicationName: "TraceBook",
  // `appleWebApp` emits the modern `mobile-web-app-capable` plus the Apple
  // variants, which is what iOS actually reads.
  appleWebApp: {
    capable: true,
    title: "TraceBook",
    statusBarStyle: "default",
  },
  other: {
    "mobile-web-app-capable": "yes",
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
      <body className={`${inter.variable} ${kufi.variable} font-sans`}>
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
