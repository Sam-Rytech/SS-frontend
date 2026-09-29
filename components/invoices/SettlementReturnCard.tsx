"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Money } from "@/components/currency";

interface SettlementReturnCardProps {
  payout: number | null;
  committedAmount: number;
}

function SettlementReturnCardSkeleton() {
  return (
    <Card data-testid="settlement-return-skeleton">
      <CardHeader>
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-16" />
      </CardContent>
    </Card>
  );
}

export function SettlementReturnCard({ payout, committedAmount }: SettlementReturnCardProps) {
  if (payout === null) {
    return <SettlementReturnCardSkeleton />;
  }

  const returnPercent = committedAmount > 0 ? Math.round((payout / committedAmount) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-medium text-muted-foreground">Settlement Payout</h3>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="text-2xl font-bold"><Money xlm={payout} xlmText={`${payout.toLocaleString()} XLM`} /></p>
        <p className="text-sm text-muted-foreground">{returnPercent}% return</p>
      </CardContent>
    </Card>
  );
}
