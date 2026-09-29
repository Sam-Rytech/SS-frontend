"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { usePortfolio } from "@/hooks/usePortfolio";
import { fetchInvestorPayouts, type PayoutRecord } from "@/lib/api";
import { Money, ExchangeRateDisclaimer } from "@/components/currency";
import { availableFractions } from "@/lib/portfolio";
import { FractionTransferModal } from "@/components/dashboard/FractionTransferModal";
import { SettlementCountdown } from "@/components/marketplace/SettlementCountdown";
import { Download, ExternalLink } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

type Tab = "holdings" | "returns" | "payouts";

// ─── Tab button ────────────────────────────────────────────────────────────

function TabButton({
  label,
  active,
  onClick,
  testId,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

// ─── Holdings tab ──────────────────────────────────────────────────────────

function HoldingsTab() {
  const { data, isLoading, isFetching } = usePortfolio();

  if (isLoading || !data) {
    return (
      <div className="space-y-3" data-testid="holdings-loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const activePositions = data.positions.filter((p) => p.status === "active");

  if (activePositions.length === 0) {
    return (
      <div
        className="py-12 text-center space-y-4"
        data-testid="holdings-empty"
      >
        <p className="text-muted-foreground">
          No active holdings yet — browse the marketplace to get started.
        </p>
        <Button asChild>
          <Link href="/marketplace">Browse Invoices</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="holdings-list">
      {isFetching && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
          Refreshing…
        </p>
      )}
      <div className="overflow-x-auto rounded-md border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50 text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Invoice</th>
              <th className="p-3 font-medium">Fractions Owned</th>
              <th className="p-3 font-medium">Current Value</th>
              <th className="p-3 font-medium">Maturity Date</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {activePositions.map((pos) => (
              <tr
                key={pos.invoice_id}
                className="hover:bg-muted/30"
                data-testid={`holding-row-${pos.invoice_id}`}
              >
                <td className="p-3 font-medium">{pos.invoice_title}</td>
                <td className="p-3">
                  {pos.quantity ?? "—"}
                  {/*
                    Listed fractions are locked into a live sale, so the
                    transferable figure is lower than the figure owned (#421).
                  */}
                  {(pos.listed_quantity ?? 0) > 0 && (
                    <span
                      className="ml-1.5 text-xs text-muted-foreground"
                      data-testid={`listed-fractions-${pos.invoice_id}`}
                    >
                      ({availableFractions(pos)} free)
                    </span>
                  )}
                </td>
                <td className="p-3"><Money xlm={pos.committed_amount} /></td>
                <td className="p-3 text-muted-foreground">
                  {pos.lockup_expires_at ? (
                    /*
                     * The countdown reads the server-side maturity timestamp
                     * rather than the formatted date, so the two never drift
                     * apart by a timezone (#423).
                     */
                    <SettlementCountdown
                      maturityDate={pos.lockup_expires_at}
                      settledAt={pos.status === "settled" ? null : undefined}
                    />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-3">
                  <Badge variant="outline" className="capitalize">
                    {pos.status}
                  </Badge>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end">
                    <FractionTransferModal position={pos} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Returns tab ───────────────────────────────────────────────────────────

function ReturnsTab() {
  const { data, isLoading } = usePortfolio();
  const {
    data: payoutsData,
    isLoading: payoutsLoading,
  } = useInfiniteQuery({
    queryKey: ["investor-payouts-returns"],
    queryFn: ({ pageParam }) =>
      fetchInvestorPayouts(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.has_more ? (last.next_cursor ?? undefined) : undefined,
  });

  if (isLoading || payoutsLoading || !data) {
    return (
      <div className="space-y-3" data-testid="returns-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const positions = data.positions;
  const allPayouts = payoutsData?.pages.flatMap((p) => p.payouts) ?? [];

  const totalInvested = positions.reduce((s, p) => s + p.committed_amount, 0);

  const totalYieldEarned = allPayouts.reduce(
    (s, p) => s + Math.max(0, p.amountReceived - p.amountInvested),
    0
  );

  const averageYield =
    allPayouts.length > 0
      ? allPayouts.reduce((s, p) => s + p.yield, 0) / allPayouts.length
      : 0;

  const settledCount = positions.filter((p) => p.status === "settled").length;
  const activeCount = positions.filter((p) => p.status === "active").length;

  return (
    <div className="space-y-4" data-testid="returns-tab">
      <ExchangeRateDisclaimer />
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="pt-6 space-y-1">
            <p className="text-sm text-muted-foreground">Total Invested</p>
            <p className="text-2xl font-bold"><Money xlm={totalInvested} /></p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-1">
            <p className="text-sm text-muted-foreground">Total Yield Earned</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              <Money xlm={totalYieldEarned} />
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-1">
            <p className="text-sm text-muted-foreground">Average Yield</p>
            <p className="text-2xl font-bold">
              {averageYield.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 space-y-1">
            <p className="text-sm text-muted-foreground">Holdings Breakdown</p>
            <p className="text-lg font-bold">
              {activeCount} active · {settledCount} settled
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── CSV export helper ─────────────────────────────────────────────────────

function exportPayoutsCsv(payouts: PayoutRecord[]) {
  const header = [
    "Invoice ID",
    "Seller Name",
    "Amount Invested (XLM)",
    "Amount Received (XLM)",
    "Yield (%)",
    "Settled At",
  ].join(",");

  const rows = payouts.map((p) =>
    [
      p.invoiceId,
      `"${p.sellerName.replace(/"/g, '""')}"`,
      p.amountInvested,
      p.amountReceived,
      p.yield,
      p.settledAt,
    ].join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `payout-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Payout History tab ────────────────────────────────────────────────────

function PayoutHistoryTab() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["investor-payouts"],
    queryFn: ({ pageParam }) =>
      fetchInvestorPayouts(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) =>
      last.has_more ? (last.next_cursor ?? undefined) : undefined,
  });

  const allPayouts = data?.pages.flatMap((p) => p.payouts) ?? [];

  const handleExport = useCallback(() => {
    exportPayoutsCsv(allPayouts);
  }, [allPayouts]);

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="payouts-loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-8 text-center text-destructive">
        Failed to load payout history.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* CSV Export */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExport}
          disabled={allPayouts.length === 0}
          data-testid="export-csv-button"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {allPayouts.length === 0 ? (
        <div
          className="py-12 text-center text-muted-foreground"
          data-testid="payouts-empty"
        >
          No payouts yet
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-card">
          <table
            className="w-full text-left text-sm"
            data-testid="payout-history-table"
          >
            <thead className="border-b bg-muted/50 text-muted-foreground">
              <tr>
                <th className="p-3 font-medium">Invoice</th>
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Amount Received</th>
                <th className="p-3 font-medium">Yield</th>
                <th className="p-3 font-medium">Tx Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allPayouts.map((row, idx) => (
                <tr
                  key={`${row.invoiceId}-${idx}`}
                  className="hover:bg-muted/30"
                  data-testid={`payout-row-${row.invoiceId}`}
                >
                  <td className="p-3 font-medium">{row.invoiceId}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(row.settledAt).toLocaleDateString()}
                  </td>
                  <td className="p-3 font-semibold">
                    {row.amountReceived.toLocaleString()} XLM
                  </td>
                  <td className="p-3">{row.yield}%</td>
                  <td className="p-3">
                    {/* PayoutRecord doesn't carry txHash from the API shape —
                        render invoiceId as receipt reference until backend
                        exposes it, with an explorer link stub. */}
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${row.invoiceId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                      aria-label={`View settlement for ${row.invoiceId} on explorer`}
                    >
                      {row.invoiceId.slice(0, 12)}…
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasNextPage && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            data-testid="payouts-load-next"
          >
            {isFetchingNextPage ? "Loading…" : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main exported component ───────────────────────────────────────────────

export function InvestorPortfolioPage() {
  const [activeTab, setActiveTab] = useState<Tab>("holdings");
  const { data, isLoading, isFetching } = usePortfolio();

  const totalCommitted =
    data?.positions
      .filter((p) => p.status === "active")
      .reduce((s, p) => s + p.committed_amount, 0) ?? 0;

  return (
    <div className="space-y-6" data-testid="investor-portfolio-page">
      <ExchangeRateDisclaimer />
      {/* Summary card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Total Active Investment
              </p>
              {isLoading ? (
                <Skeleton className="h-7 w-32 mt-1" />
              ) : (
                <p className="text-2xl font-bold"><Money xlm={totalCommitted} /></p>
              )}
            </div>
            {isFetching && !isLoading && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
                Refreshing…
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex border-b gap-6">
        <TabButton
          label="Holdings"
          active={activeTab === "holdings"}
          onClick={() => setActiveTab("holdings")}
          testId="tab-holdings"
        />
        <TabButton
          label="Returns"
          active={activeTab === "returns"}
          onClick={() => setActiveTab("returns")}
          testId="tab-returns"
        />
        <TabButton
          label="Payout History"
          active={activeTab === "payouts"}
          onClick={() => setActiveTab("payouts")}
          testId="tab-payout-history"
        />
      </div>

      {/* Tab content — mounts all tabs to keep React Query cache warm */}
      <div className={activeTab === "holdings" ? "" : "hidden"}>
        <HoldingsTab />
      </div>
      <div className={activeTab === "returns" ? "" : "hidden"}>
        <ReturnsTab />
      </div>
      <div className={activeTab === "payouts" ? "" : "hidden"}>
        <PayoutHistoryTab />
      </div>
    </div>
  );
}
