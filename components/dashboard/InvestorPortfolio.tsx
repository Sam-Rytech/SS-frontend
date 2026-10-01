"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PortfolioRowSkeleton } from "@/components/ui/skeletons";
import { PositionCard } from "@/components/dashboard/PositionCard";
import { PayoutHistoryTable } from "@/components/dashboard/PayoutHistoryTable";
import { VestingProgressWidget } from "@/components/dashboard/VestingProgressWidget";
import { DividendEarningsCard } from "@/components/dashboard/DividendEarningsCard";
import { usePortfolio } from "@/hooks/usePortfolio";
import { calculateActiveTotal } from "@/lib/portfolio";

export function InvestorPortfolio() {
  const [activeTab, setActiveTab] = useState<"active" | "history" | "payouts">("active");
  const { data, isLoading, isFetching } = usePortfolio();

  // Show full skeleton only on initial load
  if (isLoading || !data) {
    return (
      <div className="space-y-6" data-testid="investor-portfolio-loading" aria-busy="true">
        <Card>
          <CardContent className="pt-6 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-7 w-32" />
          </CardContent>
        </Card>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <PortfolioRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const positions = data.positions;
  const activePositions = positions.filter((position) => position.status === "active");
  const historicalPositions = positions.filter((position) => position.status !== "active");
  const { formattedTotal } = calculateActiveTotal(positions);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Total Committed (Active)
                </p>
                <p className="text-2xl font-bold">{formattedTotal}</p>
              </div>
              {isFetching && (
                <div
                  className="text-xs text-muted-foreground flex items-center gap-1"
                  data-testid="portfolio-refreshing"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-pulse" />
                  Refreshing…
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <DividendEarningsCard />
      </div>

      <div className="flex items-center justify-between border-b gap-4">
        <div className="flex gap-4">
          <button
            type="button"
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "active"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("active")}
            data-testid="tab-active-positions"
          >
            Active Positions ({activePositions.length})
          </button>
          <button
            type="button"
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "history"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setActiveTab("history")}
            data-testid="tab-position-history"
          >
            Position History ({historicalPositions.length})
          </button>
          <button
            type="button"
            className={`pb-2 text-sm font-semibold border-b-2 transition-colors ${activeTab === "payouts" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("payouts")}
            data-testid="tab-payout-history"
          >
            Payout History
          </button>
        </div>
        <Link
          href="/investor/settlements"
          className="pb-2 text-sm text-primary hover:underline"
        >
          Claim settlements
        </Link>
      </div>

      {activeTab === "active" ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Active Positions</h2>
          {activePositions.length === 0 ? (
            <div
              className="flex flex-col items-center gap-4 py-12 text-center"
              data-testid="investor-portfolio-empty"
            >
              <p className="text-muted-foreground">
                No active investments yet — browse the marketplace to get started
              </p>
              <Button asChild>
                <Link href="/marketplace">Browse Invoices</Link>
              </Button>
            </div>
          ) : (
            activePositions.map((position) => (
              <PositionCard key={position.invoice_id} position={position} />
            ))
          )}
        </div>
      ) : activeTab === "history" ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Historical Positions</h2>
          {historicalPositions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No historical positions yet</p>
          ) : historicalPositions.map((position) => (
            <PositionCard key={position.invoice_id} position={position} />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Payout History</h2>
          <PayoutHistoryTable />
        </div>
      )}

      <VestingProgressWidget positions={positions} />
    </div>
  );
}
