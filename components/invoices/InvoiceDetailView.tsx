"use client";

/**
 * Invoice detail page (issue #376)
 *
 * The canonical view of a single invoice: issuer, financials, funding
 * progress, documents and the invest CTA. The invest CTA is only offered to
 * KYC-approved wallets, and an unknown invoice ID renders a not-found state
 * instead of an error.
 */

import Link from "next/link";
import { FileQuestion, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DaysRemainingBadge } from "@/components/invoices/DaysRemaining";
import { FundingProgressBar } from "@/components/invoices/FundingProgressBar";
import { InvoiceBackButton } from "@/components/invoices/InvoiceBackButton";
import { InvoiceDocumentsTab } from "@/components/invoices/InvoiceDocumentsTab";
import { InvoiceFinancials } from "@/components/invoices/InvoiceFinancials";
import { InvoiceMaturityStatus } from "@/components/invoices/InvoiceMaturityStatus";
import { InvoiceMetaTags } from "@/components/invoices/InvoiceMetaTags";
import { InvestorSocialProof } from "@/components/invoices/InvestorSocialProof";
import { InvoiceStatusBadge } from "@/components/invoices/InvoiceStatusBadge";
import { InvestmentModal } from "@/components/invoices/InvestmentModal";
import { InvoiceRatingWidget } from "@/components/invoices/InvoiceRatingWidget";
import { ReturnsBreakdown } from "@/components/invoices/ReturnsBreakdown";
import { ShareInvoiceButton } from "@/components/invoices/ShareInvoiceButton";
import { WatchlistButton } from "@/components/invoices/WatchlistButton";
import { useIsKycApproved } from "@/hooks/useKycStatus";
import { useInvoiceStatusPolling } from "@/hooks/useInvoiceStatusPolling";
import { usePageTitle } from "@/hooks/usePageTitle";
import { useProtocolStatus } from "@/hooks/useProtocolStatus";
import { useWallet } from "@/context/WalletContext";
import { isExpired } from "@/components/marketplace";
import { InvestorDemandMetrics } from "@/components/marketplace/InvestorDemandMetrics";
import { InvoiceTagPills } from "@/components/marketplace/InvoiceTagPills";
import { SettlementCountdown } from "@/components/marketplace/SettlementCountdown";
import { truncateAddress } from "@/lib/stellar";
import { DEFAULT_MIN_INVESTMENT } from "@/lib/invoiceDefaults";

function InvoiceDetailSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" data-testid="invoice-detail-loading">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-72" />
          <Skeleton className="mt-2 h-4 w-48" />
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-28" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/** Rendered for an invoice ID the API does not know about. */
export function InvoiceNotFound({ invoiceId }: { invoiceId: string }) {
  return (
    <div
      className="rounded-xl border border-dashed p-12 text-center"
      data-testid="invoice-not-found"
      role="alert"
    >
      <FileQuestion className="mx-auto h-10 w-10 text-muted-foreground" />
      <h1 className="mt-4 text-xl font-semibold">Invoice not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        We could not find invoice{" "}
        <span className="font-mono" data-testid="invoice-not-found-id">
          {invoiceId}
        </span>
        . It may have been removed, or the link may be incorrect.
      </p>
      <Button asChild className="mt-6">
        <Link href="/marketplace">Back to marketplace</Link>
      </Button>
    </div>
  );
}

/**
 * The invest CTA. Hidden outright for wallets that have not passed KYC —
 * showing a button that always fails is worse than not offering it.
 */
function InvestCallToAction({
  invoiceId,
  minInvestment,
  maxInvestment,
  fundingCap,
}: {
  invoiceId: string;
  minInvestment: number;
  maxInvestment: number;
  fundingCap: number;
}) {
  const { isConnected } = useWallet();
  const { isApproved, isLoading, status } = useIsKycApproved({
    enabled: isConnected,
  });

  if (!isConnected) {
    return (
      <Card data-testid="invest-cta">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            Connect a wallet to invest in this invoice.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card data-testid="invest-cta">
        <CardContent className="pt-6">
          <Skeleton className="h-9 w-32" data-testid="invest-cta-loading" />
        </CardContent>
      </Card>
    );
  }

  if (!isApproved) {
    return (
      <Card data-testid="invest-cta">
        <CardContent className="pt-6">
          <p
            className="flex items-center gap-2 text-sm text-muted-foreground"
            data-testid="invest-hidden-not-approved"
          >
            <ShieldAlert className="h-4 w-4" />
            Investing is available once your KYC is approved.
          </p>
          <p className="mt-1 text-xs text-muted-foreground" data-testid="kyc-status">
            Current KYC status: {status ?? "unknown"}
          </p>
          <Button asChild variant="outline" size="sm" className="mt-3">
            <Link href="/kyc/status">View KYC status</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="invest-cta">
      <CardContent className="pt-6">
        <InvestmentModal
          invoiceId={invoiceId}
          minInvestment={minInvestment}
          maxInvestment={maxInvestment}
          fundingCap={fundingCap}
        />
      </CardContent>
    </Card>
  );
}

export interface InvoiceDetailViewProps {
  invoiceId: string;
}

export function InvoiceDetailView({ invoiceId }: InvoiceDetailViewProps) {
  const { data: invoice, isLoading, isError, isFetching } = useInvoiceStatusPolling({
    invoiceId,
  });
  const { data: protocolStatus } = useProtocolStatus();
  const { address } = useWallet();

  // The floor is a per-invoice setting from invoice API (#436), falling back to protocol-wide setting.
  const minInvestment = invoice?.min_investment ?? protocolStatus?.min_investment ?? DEFAULT_MIN_INVESTMENT;

  usePageTitle(invoice?.title ?? null);

  if (isLoading) return <InvoiceDetailSkeleton />;

  if (isError || !invoice) return <InvoiceNotFound invoiceId={invoiceId} />;

  const expired = isExpired(invoice.due_date);
  const remaining = Math.max(0, invoice.amount - invoice.raised);
  const isOpenForInvestment = invoice.status === "open" && !expired && remaining > 0;
  // Qualifying investor: connected wallet appears in the investor list (#348).
  const isQualifyingInvestor = Boolean(
    address && invoice.investors.some((inv) => inv.address === address)
  );

  return (
    <div className="space-y-6">
      <InvoiceMetaTags
        title={invoice.title}
        status={invoice.status}
        amount={invoice.amount}
        invoiceId={invoice.id}
        investorCount={invoice.investor_count}
      />

      {/* Header: title, issuer, status and time left to fund. */}
      <Card data-testid="invoice-detail-header">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <InvoiceBackButton />
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-bold" data-testid="invoice-title">
                  {invoice.title}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground" data-testid="invoice-issuer">
                  Issuer:{" "}
                  {/* The seller address doubles as the issuer id, so the public
                      issuer profile (#400) is reachable from every invoice. */}
                  <Link
                    href={`/issuers/${encodeURIComponent(invoice.seller)}`}
                    data-testid="issuer-profile-link"
                    className="font-mono hover:underline"
                  >
                    {truncateAddress(invoice.seller)}
                  </Link>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <InvoiceStatusBadge status={invoice.status} />
              <DaysRemainingBadge dueDate={invoice.due_date} status={invoice.status} />
              <WatchlistButton invoiceId={invoice.id} />
              <ShareInvoiceButton invoiceId={invoice.id} title={invoice.title} />
            </div>
          </div>

          {invoice.description && (
            <p className="pt-2 text-sm text-muted-foreground" data-testid="invoice-description">
              {invoice.description}
            </p>
          )}
        </CardHeader>
      </Card>

      <InvoiceFinancials
        faceValue={invoice.amount}
        yieldPercentage={invoice.yield_percentage}
        maturityDate={invoice.due_date}
        minInvestment={minInvestment}
      />

      {/*
        Demand signals (#422) and the maturity countdown (#423) sit directly
        under the financials: both answer "how much interest is this getting"
        and "when do I get paid", which is what the headline numbers are for.
      */}
      <Card data-testid="invoice-demand-card">
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">Demand</p>
            <InvestorDemandMetrics
              invoiceId={invoice.id}
              investorCountFallback={invoice.investor_count}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-muted-foreground">
              Time to maturity
            </p>
            <SettlementCountdown
              maturityDate={invoice.due_date}
              settledAt={invoice.settled_at}
              variant="detail"
              labelled
            />
          </div>
          <InvoiceTagPills invoice={invoice} />
        </CardContent>
      </Card>

      {/* Funding progress: amount raised against the face value. */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Funding progress</h2>
        </CardHeader>
        <CardContent>
          <FundingProgressBar
            raised={invoice.raised}
            target={invoice.amount}
            investorCount={invoice.investor_count}
          />
          <div className="mt-3">
            <InvestorSocialProof count={invoice.investor_count} />
          </div>
          {isFetching && (
            <p className="mt-2 text-xs text-muted-foreground" data-testid="invoice-refreshing">
              Refreshing…
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invest CTA — KYC gated. */}
      {isOpenForInvestment ? (
        <InvestCallToAction
          invoiceId={invoice.id}
          minInvestment={minInvestment}
          maxInvestment={remaining}
          fundingCap={invoice.amount}
        />
      ) : (
        <Card data-testid="invest-cta">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground" data-testid="invest-unavailable">
              {invoice.status === "settled"
                ? "This invoice has been settled and is no longer open for investment."
                : invoice.status === "funded"
                  ? "This invoice has reached its funding target."
                  : invoice.status === "rejected"
                    ? "This invoice was rejected during review."
                    : invoice.status === "draft"
                      ? "This invoice has not been published yet."
                      : "This invoice is no longer accepting investments."}
            </p>
          </CardContent>
        </Card>
      )}

      <InvoiceDocumentsTab
        documentUrl={invoice.document_url ?? null}
        additionalDocuments={invoice.documents ?? []}
      />

      <InvoiceRatingWidget
        invoiceId={invoice.id}
        isEligible={isQualifyingInvestor}
        walletAddress={address}
      />

      {invoice.investors.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Investors</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoice.investors.map((investor) => (
              <div
                key={investor.address}
                className="flex items-center justify-between"
                data-testid={`investor-${investor.address}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary font-mono text-xs">
                    {investor.address.slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-mono text-sm">{truncateAddress(investor.address)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(investor.timestamp).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-medium">{investor.amount.toLocaleString()} XLM</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {invoice.status === "funded" && (
        <InvoiceMaturityStatus maturityDate={invoice.maturity_date} />
      )}

      {(invoice.status === "settled" || invoice.status === "funded") && (
        <ReturnsBreakdown invoiceId={invoice.id} />
      )}
    </div>
  );
}
