"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchInvestorPayouts, PayoutRecord } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TxHash } from "@/components/ui/tx-hash";
import { Money, ExchangeRateDisclaimer } from "@/components/currency";

export function PayoutHistoryTable() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useInfiniteQuery({
    queryKey: ["investor-payouts"],
    queryFn: ({ pageParam }) => fetchInvestorPayouts(pageParam as string | undefined),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor ?? undefined : undefined,
  });

  const allPayouts = data?.pages.flatMap((p) => p.payouts) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-3" data-testid="payout-history-loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="py-8 text-center text-red-500">
        Failed to load payout history.
      </p>
    );
  }

  if (allPayouts.length === 0) {
    return (
      <div className="py-12 text-center text-muted-foreground" data-testid="empty-payouts">
        No payouts yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-md border bg-card">
        <ExchangeRateDisclaimer className="px-3 pt-3" />
        <table className="w-full text-left text-sm" data-testid="payout-history-table">
          <thead className="border-b bg-muted/50 text-muted-foreground">
            <tr>
              <th className="p-3 font-medium">Invoice ID</th>
              <th className="p-3 font-medium">Seller Name</th>
              <th className="p-3 font-medium">Amount Invested</th>
              <th className="p-3 font-medium">Amount Received</th>
              <th className="p-3 font-medium">Yield</th>
              <th className="p-3 font-medium">Settled At</th>
              <th className="p-3 font-medium">Transaction</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {allPayouts.map((row, idx) => {
              const isShortfall = row.amountReceived < row.amountInvested;
              return (
                <tr
                  key={`${row.invoiceId}-${idx}`}
                  className={
                    isShortfall
                      ? "bg-amber-500/15 text-amber-950 dark:text-amber-200 font-medium"
                      : "hover:bg-muted/30"
                  }
                  data-testid={`payout-row-${row.invoiceId}`}
                >
                  <td className="p-3">{row.invoiceId}</td>
                  <td className="p-3">{row.sellerName}</td>
                  <td className="p-3"><Money xlm={row.amountInvested} xlmText={`${row.amountInvested.toLocaleString()} XLM`} /></td>
                  <td className="p-3 font-semibold"><Money xlm={row.amountReceived} xlmText={`${row.amountReceived.toLocaleString()} XLM`} /></td>
                  <td className="p-3">{row.yield}%</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(row.settledAt).toLocaleDateString()}
                  </td>
                  <td className="p-3">
                    {row.transaction_hash || row.transactionHash ? (
                      <TxHash
                        hash={(row.transaction_hash ?? row.transactionHash) as string}
                        className="text-xs"
                        testId={`payout-tx-${row.invoiceId}`}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {hasNextPage && (
        <div className="text-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            data-testid="payouts-load-next"
          >
            {isFetchingNextPage ? "Loading..." : "Load Next Page"}
          </Button>
        </div>
      )}
    </div>
  );
}
