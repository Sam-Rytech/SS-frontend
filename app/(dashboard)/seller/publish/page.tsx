"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import { useSellerKycStatus } from "@/hooks/useSellerDashboard";
import { PublishInvoiceForm } from "@/components/invoices";
import { Button } from "@/components/ui/button";

export default function PublishInvoicePage() {
  const router = useRouter();
  const { isConnected, isInitializing } = useStellarWallet();
  const { data: kycStatus, isLoading: isKycLoading } = useSellerKycStatus();

  useEffect(() => {
    if (!isInitializing && !isConnected) {
      router.replace("/connect-wallet");
    }
  }, [isInitializing, isConnected, router]);

  if (isInitializing || !isConnected) {
    return null;
  }

  if (isKycLoading) {
    return null;
  }

  if (kycStatus?.status !== "approved") {
    return (
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Publish Invoice</h1>
        <div
          className="rounded-md border border-amber-300 bg-amber-50 px-4 py-4 text-sm text-amber-900"
          data-testid="publish-kyc-blocked"
        >
          <p className="mb-3">
            You must complete KYC verification before you can publish an invoice.
          </p>
          <Button asChild size="sm">
            <Link href={kycStatus?.status === "rejected" ? "/kyc/reapply" : "/kyc/start"}>
              Complete KYC
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Publish Invoice</h1>
      <PublishInvoiceForm />
    </main>
  );
}
