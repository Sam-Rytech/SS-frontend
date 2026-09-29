"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight } from "lucide-react";
import { Money, ExchangeRateDisclaimer } from "@/components/currency";

interface DividendData {
  totalEarned: number;
  pendingClaims: number;
  claimsByCycle: Array<{
    cycle: string;
    amount: number;
    claimable: boolean;
  }>;
  lastUpdated: number;
}

export function DividendEarningsCard() {
  const [dividends, setDividends] = useState<DividendData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    const fetchDividends = async () => {
      try {
        const res = await fetch("/api/investor/dividends");
        if (res.ok) {
          const data = await res.json();
          setDividends(data);
        }
      } catch (error) {
        console.error("Failed to fetch dividends:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDividends();
    const interval = setInterval(fetchDividends, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleClaimAll = async () => {
    if (!dividends || dividends.pendingClaims === 0) return;

    setIsClaiming(true);
    try {
      const res = await fetch("/api/investor/claim-dividends", {
        method: "POST",
      });
      if (res.ok) {
        const updated = await res.json();
        setDividends(updated);
      }
    } catch (error) {
      console.error("Claim failed:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="dividend-earnings-loading">
        <CardContent className="pt-6 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-7 w-32" />
        </CardContent>
      </Card>
    );
  }

  if (!dividends) {
    return null;
  }

  return (
    <>
      <Card data-testid="dividend-earnings-card">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Dividend Earnings
              </p>
              <p className="text-2xl font-bold">
                <Money
                  xlm={dividends.totalEarned}
                  xlmText={`${dividends.totalEarned.toLocaleString()} XLM`}
                />
              </p>
              <ExchangeRateDisclaimer className="mt-1 max-w-md" />
              {dividends.pendingClaims > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  <Money
                    xlm={dividends.pendingClaims}
                    xlmText={`${dividends.pendingClaims.toLocaleString()} XLM`}
                  />{" "}
                  pending
                </p>
              )}
            </div>
            {dividends.pendingClaims > 0 && (
              <Button
                onClick={handleClaimAll}
                disabled={isClaiming}
                data-testid="claim-all-button"
              >
                {isClaiming ? "Claiming..." : "Claim All"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {dividends.pendingClaims > 0 && (
        <Card data-testid="pending-dividends-card">
          <CardHeader>
            <h3 className="text-lg font-semibold">Pending by Cycle</h3>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dividends.claimsByCycle.map((claim, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-muted-foreground">{claim.cycle}</span>
                  <span className="font-semibold">
                    <Money xlm={claim.amount} xlmText={`${claim.amount.toLocaleString()} XLM`} />
                  </span>
                </div>
              ))}
            </div>
            <Button asChild variant="ghost" size="sm" className="w-full mt-4">
              <Link href="/investor/dividends">
                View History
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
