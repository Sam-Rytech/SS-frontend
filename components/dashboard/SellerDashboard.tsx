"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileStatsSkeleton } from "@/components/ui/skeletons";
import { KycStatusBanner } from "@/components/dashboard/KycStatusBanner";
import { SellerInvoiceTabs } from "@/components/dashboard/SellerInvoiceTabs";
import { OnboardingChecklist } from "@/components/dashboard/OnboardingChecklist";
import {
  useSellerDashboard,
  useSellerKycStatus,
} from "@/hooks/useSellerDashboard";
import { useStellarWallet } from "@/hooks/useStellarWallet";
import type { Invoice } from "@/lib/api";
import { cn } from "@/lib/utils";

function formatXlm(amount: number): string {
  return `${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} XLM`;
}

/**
 * Pipeline stages surfaced on the seller dashboard (issue #313). Mapped
 * directly onto the backend's `Invoice.status` values — there is no
 * separate "submitted" / "under review" status in the current API, so
 * those stages from the issue's original spec aren't representable here
 * without a backend change (see PR description).
 */
const PIPELINE_STAGES: { key: Invoice["status"]; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "open", label: "Active" },
  { key: "funded", label: "Funded" },
  { key: "settled", label: "Settled" },
  { key: "rejected", label: "Rejected" },
];

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

function InvoiceRowSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-32 mt-1" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-3 w-full" />
      </CardContent>
    </Card>
  );
}

export function SellerDashboard() {
  const { data, isLoading } = useSellerDashboard();
  const { data: kycStatus } = useSellerKycStatus();
  const wallet = useStellarWallet();
  const [selectedStage, setSelectedStage] = useState<Invoice["status"] | null>(
    null
  );

  if (isLoading || !data) {
    return (
      <div className="space-y-6" data-testid="seller-dashboard-loading" aria-busy="true">
        <ProfileStatsSkeleton />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <InvoiceRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const stageCounts = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    count: data.invoices.filter((invoice) => invoice.status === stage.key)
      .length,
  }));

  return (
    <div className="space-y-6">
      {kycStatus && (
        <KycStatusBanner
          status={kycStatus.status}
          reason={kycStatus.rejection_reason ?? kycStatus.reason}
        />
      )}

      <OnboardingChecklist
        walletConnected={wallet.isConnected}
        kycStatus={kycStatus?.status ?? null}
        invoiceCount={data.invoices.length}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Earnings Summary</h2>
        <Button asChild size="sm" data-testid="quick-action-submit-invoice">
          <Link href="/seller/publish">Submit New Invoice</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Total Invoices"
          value={data.total_invoices.toString()}
        />
        <StatCard label="Total Funded" value={data.total_funded.toString()} />
        <StatCard label="Total Settled" value={data.total_settled.toString()} />
        <StatCard label="XLM Raised" value={formatXlm(data.total_raised)} />
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Pipeline</h2>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Filter invoices by pipeline stage"
        >
          <button
            type="button"
            onClick={() => setSelectedStage(null)}
            aria-pressed={selectedStage === null}
            data-testid="pipeline-stage-all"
            className={cn(
              "rounded-full border px-3 py-1 text-sm",
              selectedStage === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background"
            )}
          >
            All ({data.invoices.length})
          </button>
          {stageCounts.map((stage) => (
            <button
              key={stage.key}
              type="button"
              onClick={() => setSelectedStage(stage.key)}
              aria-pressed={selectedStage === stage.key}
              data-testid={`pipeline-stage-${stage.key}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                selectedStage === stage.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background"
              )}
            >
              {stage.label} ({stage.count})
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Invoice Breakdown</h2>
        <SellerInvoiceTabs
          invoices={data.invoices}
          statusFilter={selectedStage}
        />
      </div>
    </div>
  );
}
