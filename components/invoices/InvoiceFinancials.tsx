"use client";

/**
 * Invoice financials (issue #376)
 *
 * The four numbers an investor checks before committing: face value, yield,
 * maturity date and the protocol's minimum investment. Every field renders
 * from the API value and degrades to an explicit em dash rather than a blank
 * or a misleading zero when the API omits it.
 */

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Money, ExchangeRateDisclaimer } from "@/components/currency";

interface InvoiceFinancialsProps {
  /** Face value of the whole invoice. */
  faceValue: number;
  /** Annualised yield in percent; omitted by some issuers. */
  yieldPercentage?: number | null;
  /** Maturity date (ISO 8601). */
  maturityDate: string;
  /** Protocol-wide minimum investment floor. */
  minInvestment: number;
}

const NOT_PROVIDED = "—";

function formatMaturity(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return NOT_PROVIDED;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InvoiceFinancials({
  faceValue,
  yieldPercentage,
  maturityDate,
  minInvestment,
}: InvoiceFinancialsProps) {
  const fields = [
    {
      key: "face-value",
      label: "Face value",
      value: <Money xlm={faceValue} />,
      testId: "financial-face-value",
    },
    {
      key: "yield",
      label: "Yield",
      value:
        yieldPercentage === undefined || yieldPercentage === null
          ? NOT_PROVIDED
          : `${yieldPercentage}%`,
      testId: "financial-yield",
    },
    {
      key: "maturity",
      label: "Maturity date",
      value: formatMaturity(maturityDate),
      testId: "financial-maturity-date",
    },
    {
      key: "min-investment",
      label: "Minimum investment",
      value: <Money xlm={minInvestment} />,
      testId: "financial-min-investment",
    },
  ];

  return (
    <Card data-testid="invoice-financials">
      <CardHeader>
        <h2 className="text-lg font-semibold">Financials</h2>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {fields.map((field) => (
            <div key={field.key}>
              <dt className="text-sm text-muted-foreground">{field.label}</dt>
              <dd
                className="mt-0.5 text-lg font-semibold"
                data-testid={field.testId}
              >
                {field.value}
              </dd>
            </div>
          ))}
        </dl>
        <ExchangeRateDisclaimer className="mt-4" />
      </CardContent>
    </Card>
  );
}
