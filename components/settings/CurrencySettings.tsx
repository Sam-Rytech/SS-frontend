"use client";

/**
 * Multi-currency display (#437): display-currency card on the settings page.
 * Uses the same shared toggle as the navbar, so both always agree.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyToggle } from "@/components/layout/CurrencyToggle";
import { ExchangeRateDisclaimer } from "@/components/currency";

export function CurrencySettings() {
  return (
    <Card data-testid="currency-settings">
      <CardHeader>
        <CardTitle>Display currency</CardTitle>
        <CardDescription>
          Show prices, yields and payouts in USD or XLM. Your choice is saved on this device.
          Invoices always settle in XLM.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CurrencyToggle showRate />
        <ExchangeRateDisclaimer />
      </CardContent>
    </Card>
  );
}
