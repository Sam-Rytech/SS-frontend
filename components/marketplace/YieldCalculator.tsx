"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  calculateYield,
  DEFAULT_PLATFORM_FEE_PERCENT,
  YIELD_PRESET_AMOUNTS,
} from "@/lib/yieldCalculator";

/** Results recompute 200ms after the last keystroke (issue #423). */
const RESULTS_DEBOUNCE_MS = 200;

function toNumber(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

interface YieldCalculatorProps {
  defaultAmount?: number;
  defaultYieldRate?: number;
  defaultTenorDays?: number;
}

/**
 * Standalone yield calculator (issue #423).
 *
 * Models gross / net returns for any investment amount and tenor before
 * committing to a specific invoice. Preset buttons populate common
 * principals; every keystroke restarts a 200ms debounce before results
 * recompute.
 */
export function YieldCalculator({
  defaultAmount = 10000,
  defaultYieldRate = 12,
  defaultTenorDays = 90,
}: YieldCalculatorProps = {}) {
  const [amountRaw, setAmountRaw] = useState(String(defaultAmount));
  const [yieldRaw, setYieldRaw] = useState(String(defaultYieldRate));
  const [tenorRaw, setTenorRaw] = useState(String(defaultTenorDays));

  const [debounced, setDebounced] = useState({
    amount: defaultAmount,
    yieldRate: defaultYieldRate,
    tenorDays: defaultTenorDays,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced({
        amount: toNumber(amountRaw),
        yieldRate: toNumber(yieldRaw),
        tenorDays: toNumber(tenorRaw),
      });
    }, RESULTS_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [amountRaw, yieldRaw, tenorRaw]);

  const result = useMemo(
    () =>
      calculateYield({
        amount: debounced.amount,
        yieldRate: debounced.yieldRate,
        tenorDays: debounced.tenorDays,
      }),
    [debounced]
  );

  return (
    <Card data-testid="yield-calculator">
      <CardHeader>
        <CardTitle>Yield Calculator</CardTitle>
        <p className="text-sm text-muted-foreground">
          Model returns for any investment amount and tenor. Results update as
          you type.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap gap-2" data-testid="yield-presets">
          {YIELD_PRESET_AMOUNTS.map((preset) => (
            <Button
              key={preset}
              type="button"
              variant="outline"
              size="sm"
              data-testid={`preset-amount-${preset}`}
              onClick={() => setAmountRaw(String(preset))}
            >
              {preset.toLocaleString()} XLM
            </Button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="yield-calc-amount">Investment amount (XLM)</Label>
            <Input
              id="yield-calc-amount"
              data-testid="calculator-amount-input"
              type="number"
              min={0}
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="yield-calc-rate">Yield rate (% p.a.)</Label>
            <Input
              id="yield-calc-rate"
              data-testid="calculator-yield-input"
              type="number"
              min={0}
              step="0.1"
              value={yieldRaw}
              onChange={(e) => setYieldRaw(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="yield-calc-tenor">Tenor (days)</Label>
            <Input
              id="yield-calc-tenor"
              data-testid="calculator-tenor-input"
              type="number"
              min={0}
              step="1"
              value={tenorRaw}
              onChange={(e) => setTenorRaw(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 rounded-lg border bg-muted/30 p-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Gross return</p>
            <p
              className="text-lg font-semibold"
              data-testid="calculator-gross-return"
            >
              {result.grossReturn.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              XLM
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Net return (after fees)</p>
            <p
              className="text-lg font-semibold text-green-700 dark:text-green-400"
              data-testid="calculator-net-return"
            >
              {result.netReturn.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              XLM
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Annualised yield</p>
            <p
              className="text-lg font-semibold"
              data-testid="calculator-annualised-yield"
            >
              {result.annualisedYield.toFixed(2)}%
            </p>
          </div>
        </div>

        <div
          className="space-y-1 text-sm"
          data-testid="calculator-fee-breakdown"
        >
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Platform fee ({DEFAULT_PLATFORM_FEE_PERCENT}%)
            </span>
            <span data-testid="calculator-platform-fee" className="font-mono">
              −
              {result.platformFee.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              XLM
            </span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total payout</span>
            <span data-testid="calculator-total-payout" className="font-mono">
              {result.totalPayout.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{" "}
              XLM
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
