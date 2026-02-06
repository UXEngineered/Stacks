"use client";

/**
 * Client-side Providers
 * 
 * Wraps the app with necessary providers:
 * - SessionProvider (NextAuth)
 * - ThemeProvider
 */

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeProvider";

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
