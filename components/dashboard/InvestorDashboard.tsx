"use client";

import { format } from "date-fns";
import { TrendingUp, DollarSign, FileText, Clock, ExternalLink, Plus, BarChart2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { usePortfolioSummary, useRecentActivity, useUpcomingMaturities } from "@/hooks/useActivity";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Money, ExchangeRateDisclaimer } from "@/components/currency";

export function InvestorDashboard() {
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolioSummary();
  const { data: recentActivity, isLoading: activityLoading } = useRecentActivity(5);
  const { data: upcomingMaturities, isLoading: maturitiesLoading } = useUpcomingMaturities(3);

  const isLoading = portfolioLoading || activityLoading || maturitiesLoading;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const totalInvested = portfolio?.total_invested ?? 0;
  const totalYield = portfolio?.total_yield_earned ?? 0;
  const activeHoldings = portfolio?.active_holdings_count ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back! Here&apos;s an overview of your portfolio.</p>
      </div>

      <ExchangeRateDisclaimer />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold"><Money xlm={totalInvested} xlmText={`${totalInvested.toLocaleString()} XLM`} /></span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Yield Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <span className="text-3xl font-bold text-green-500"><Money xlm={totalYield} xlmText={`${totalYield.toLocaleString()} XLM`} /></span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Holdings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-3xl font-bold">{activeHoldings}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/activity">
                  View All <ExternalLink className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {recentActivity && recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((event) => (
                  <ActivityRow key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Maturities</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/portfolio">
                  View All <ExternalLink className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingMaturities && upcomingMaturities.length > 0 ? (
              <div className="space-y-3">
                {upcomingMaturities.map((maturity) => (
                  <MaturityRow key={maturity.invoice_id} maturity={maturity} />
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">No upcoming maturities</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Button asChild className="h-20 flex-col gap-2">
          <Link href="/marketplace">
            <BarChart2 className="h-8 w-8" />
            <span className="font-semibold">Browse Marketplace</span>
            <span className="text-sm text-muted-foreground">Find new invoices to invest in</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-20 flex-col gap-2">
          <Link href="/portfolio">
            <FileText className="h-8 w-8" />
            <span className="font-semibold">View Portfolio</span>
            <span className="text-sm text-muted-foreground">Manage your investments</span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-20 flex-col gap-2">
          <Link href="/watchlist">
            <Plus className="h-8 w-8" />
            <span className="font-semibold">Manage Listings</span>
            <span className="text-sm text-muted-foreground">Track your watchlist</span>
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ActivityRow({ event }: { event: { type: string; description: string; amount: number | null; currency: string; timestamp: string } }) {
  const typeColors: Record<string, string> = {
    investment: "bg-blue-100 text-blue-700",
    secondary_buy: "bg-green-100 text-green-700",
    secondary_sell: "bg-red-100 text-red-700",
    transfer: "bg-purple-100 text-purple-700",
    settlement: "bg-amber-100 text-amber-700",
  };

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3 min-w-0">
        <Badge variant="outline" className={cn("whitespace-nowrap", typeColors[event.type] || "bg-muted")}>
          {event.type.replace("_", " ")}
        </Badge>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{event.description}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(event.timestamp), "MMM d, yyyy HH:mm")}
          </p>
        </div>
      </div>
      {event.amount !== null && (
        <span className="font-mono text-sm font-medium whitespace-nowrap">
          {event.amount > 0 ? "+" : ""}{event.amount.toLocaleString()} {event.currency}
        </span>
      )}
    </div>
  );
}

function MaturityRow({ maturity }: { maturity: { invoice_id: string; title: string; amount: number; due_date: string; days_remaining: number } }) {
  const urgency = maturity.days_remaining <= 7 ? "text-destructive" : maturity.days_remaining <= 30 ? "text-amber-500" : "text-muted-foreground";

  return (
    <Link href={`/marketplace/${maturity.invoice_id}`} className="block">
      <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{maturity.title}</p>
          <p className="text-xs text-muted-foreground">{format(new Date(maturity.due_date), "MMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="font-mono text-sm font-medium"><Money xlm={maturity.amount} xlmText={`${maturity.amount.toLocaleString()} XLM`} /></p>
            <p className={cn("text-xs font-medium", urgency)}>
              {maturity.days_remaining} day{maturity.days_remaining !== 1 ? "s" : ""} left
            </p>
          </div>
          <Clock className={cn("h-4 w-4", urgency)} />
        </div>
      </div>
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="grid gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    </div>
  );
}