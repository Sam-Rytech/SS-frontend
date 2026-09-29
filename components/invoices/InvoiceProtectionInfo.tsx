"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoiceProtection } from "@/hooks/useInvoiceProtection";
import { Money } from "@/components/currency";
import { Info } from "lucide-react";

const SELL_TAX_TOOLTIP =
  "Sell tax is a small fee applied when exiting a position early. It discourages dumping and protects investor returns by keeping capital in the invoice until settlement.";
const BUYBACK_TOOLTIP =
  "The buyback pool is a reserve used to support invoice value and cover shortfalls. It protects investor returns by providing liquidity for settlements.";

/**
 * Issue #343: sell tax badge + buyback pool balance on the invoice detail
 * page. Values are cached with React Query and refreshed every 60s; the
 * skeletons reserve the final layout so refreshes cause no layout shift.
 */
export function InvoiceProtectionInfo({ invoiceId }: { invoiceId: string }) {
  const { data, isLoading } = useInvoiceProtection(invoiceId);

  if (isLoading) {
    return (
      <div
        className="flex flex-wrap items-center gap-3"
        data-testid="sell-tax-loading"
        aria-busy="true"
      >
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-40" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="invoice-protection">
      <Badge variant="secondary" data-testid="sell-tax-badge">
        Sell tax {data.sell_tax_percentage}%
        <span
          className="ml-1 inline-flex cursor-help items-center"
          title={SELL_TAX_TOOLTIP}
          data-testid="sell-tax-tooltip"
          aria-label={SELL_TAX_TOOLTIP}
        >
          <Info className="size-3" />
        </span>
      </Badge>
      <Card className="py-0 shadow-none" data-testid="buyback-pool-balance">
        <CardContent className="flex items-center gap-2 px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">Buyback pool</span>
          <span className="font-semibold">
            <Money xlm={data.buyback_pool_balance} />
          </span>
          <span
            className="inline-flex cursor-help items-center text-muted-foreground"
            title={BUYBACK_TOOLTIP}
            data-testid="buyback-pool-tooltip"
            aria-label={BUYBACK_TOOLTIP}
          >
            <Info className="size-3" />
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
