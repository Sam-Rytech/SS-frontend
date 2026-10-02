"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { notifyApiError } from "@/lib/apiErrors";

import { AuthProvider } from "@/context/AuthContext";
import { WalletProvider } from "@/context/WalletContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { AccreditationProvider } from "@/context/AccreditationContext";
import { PlatformOnboardingTour } from "@/components/onboarding/PlatformOnboardingTour";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
          // #281 — surface every failed mutation as a toast notification
          mutations: { onError: notifyApiError },
        },
      })
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      <QueryClientProvider client={queryClient}>
        {/* #379 — one shared wallet session for the whole app */}
        <WalletProvider>
          <AuthProvider>
            {/* #437 — one shared display currency + live XLM/USD rate for the app */}
            <CurrencyProvider>{children}</CurrencyProvider>
            <PlatformOnboardingTour />
            <Toaster position="top-right" />
            <AccreditationProvider>
              {children}
              <PlatformOnboardingTour />
              <Toaster position="top-right" />
            </AccreditationProvider>
          </AuthProvider>
        </WalletProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
