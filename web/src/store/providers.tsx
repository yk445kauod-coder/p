"use client";

import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/store/auth";

/**
 * Client providers shared by every route.
 *
 * Kept separate from the root layout so the layout can stay a server component
 * (which is what lets metadata and streaming work).
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-center" />
    </AuthProvider>
  );
}
