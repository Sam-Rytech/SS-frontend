"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RecentlyViewedInvoice } from "@/lib/recentlyViewed";
import { Money } from "@/components/currency";

const statusVariantMap: Record<string, "default" | "secondary" | "outline" | "destructive" | "ghost"> = {
  open: "outline",
  funded: "default",
  settled: "ghost",
  draft: "secondary",
  expired: "destructive",
};

interface RecentlyViewedProps {
  entries: RecentlyViewedInvoice[];
}

export function RecentlyViewed({ entries }: RecentlyViewedProps) {
  if (entries.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Recently Viewed</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map((invoice) => (
          <Link key={invoice.id} href={`/marketplace/${invoice.id}`}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 space-y-2">
                <p className="font-medium truncate">{invoice.title}</p>
                <Badge variant={statusVariantMap[invoice.status] ?? "outline"}>
                  {invoice.status}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  <Money xlm={invoice.amount} xlmText={`${invoice.amount.toLocaleString()} XLM`} />
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
