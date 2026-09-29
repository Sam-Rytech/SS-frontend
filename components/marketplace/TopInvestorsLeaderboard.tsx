"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/currency";
import { truncateAddress } from "@/lib/stellar";
import { useLeaderboard } from "@/hooks/useLeaderboard";

export function TopInvestorsLeaderboard() {
  const { data: investors, isLoading, isError } = useLeaderboard();

  if (isLoading) {
    return (
      <Card data-testid="leaderboard-loading">
        <CardHeader>
          <CardTitle>Top Investors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-5 w-6" />
                  <Skeleton className="h-5 w-32" />
                </div>
                <div className="flex items-center gap-6">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !investors || investors.length < 1) {
    return null;
  }

  // Sort descending by total committed XLM and take top 5
  const topInvestors = [...investors]
    .sort((a, b) => {
      const aVal = a.total_committed ?? (a as any).totalCommitted ?? 0;
      const bVal = b.total_committed ?? (b as any).totalCommitted ?? 0;
      return bVal - aVal;
    })
    .slice(0, 5);

  return (
    <Card data-testid="leaderboard-section">
      <CardHeader>
        <CardTitle>Top Investors</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs uppercase text-muted-foreground bg-muted/50 border-b">
              <tr>
                <th scope="col" className="px-4 py-3 text-center w-16">Rank</th>
                <th scope="col" className="px-4 py-3">Wallet</th>
                <th scope="col" className="px-4 py-3 text-right">Total Committed</th>
                <th scope="col" className="px-4 py-3 text-right">Invoices</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topInvestors.map((investor, index) => {
                const walletAddr = investor.address ?? (investor as any).wallet ?? (investor as any).wallet_address ?? "";
                const totalCommitted = investor.total_committed ?? (investor as any).totalCommitted ?? 0;
                const invoiceCount = investor.invoice_count ?? (investor as any).invoiceCount ?? (investor as any).invoices_count ?? 0;
                const rank = index + 1;

                return (
                  <tr key={walletAddr || index} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-semibold text-center">{rank}</td>
                    <td className="px-4 py-3 font-mono">{truncateAddress(walletAddr)}</td>
                    <td className="px-4 py-3 text-right font-medium"><Money xlm={totalCommitted} /></td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{invoiceCount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
