"use client";

import { Toaster } from "@/components/ui/sonner";

/**
 * Client providers shared by every route.
 *
 * Kept separate from the root layout so the layout can stay a server component
 * (which is what lets metadata and streaming work). Data and auth providers are
 * added here as they land.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster richColors position="top-center" />
    </>
  );
}
