"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { SettlementsTab } from "@/components/invoices/SettlementsTab";

export default function SettlementsPage() {
  usePageTitle("Settlement Claims");
  const router = useRouter();
  const { isConnected, isInitializing } = useStellarWallet();

  useEffect(() => {
    if (!isInitializing && !isConnected) {
      router.replace("/connect-wallet");
    }
  }, [isInitializing, isConnected, router]);

  if (isInitializing || !isConnected) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Settlement Claims</h1>
      <SettlementsTab />
    </main>
  );
}
