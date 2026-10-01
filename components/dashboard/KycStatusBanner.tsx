"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export type KycStatus =
  | "pending"
  | "rejected"
  | "approved"
  | "requires_resubmission"
  | "not_submitted";

interface KycStatusBannerProps {
  status: KycStatus;
  reason?: string | null;
}

const KYC_START_ROUTE = "/kyc/start";
const KYC_REAPPLY_ROUTE = "/kyc/reapply";

export function KycStatusBanner({ status, reason }: KycStatusBannerProps) {
  if (status === "approved") {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800"
        data-testid="kyc-approved-banner"
      >
        <span aria-hidden="true">✓</span>
        <p>Verified seller</p>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div
        role="status"
        className="flex items-center justify-between gap-4 rounded-md border bg-muted px-4 py-3 text-sm"
        data-testid="kyc-pending-banner"
      >
        <p>Your KYC submission is under review.</p>
        <Link href="/kyc/status" className="underline underline-offset-4">
          View status
        </Link>
      </div>
    );
  }

  if (status === "requires_resubmission") {
    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
        data-testid="kyc-resubmission-banner"
      >
        <p>Additional documents required. Please update your KYC.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={KYC_REAPPLY_ROUTE}>Go to KYC</Link>
        </Button>
      </div>
    );
  }

  if (status === "rejected") {
    const rejectionReason = reason?.trim();
    const message = `Your KYC was rejected.${
      rejectionReason ? ` Reason: ${rejectionReason}.` : ""
    } Please resubmit.`;

    return (
      <div
        role="alert"
        className="flex items-center justify-between gap-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        data-testid="kyc-rejected-banner"
      >
        <p>{message}</p>
        <Button asChild variant="destructive" size="sm">
          <Link href={KYC_REAPPLY_ROUTE}>Go to KYC</Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      role="status"
      className="flex items-center justify-between rounded-md border bg-muted px-4 py-3 text-sm"
    >
      <p>Complete KYC to publish invoices</p>
      <Button asChild size="sm">
        <Link href={KYC_START_ROUTE}>Start KYC</Link>
      </Button>
    </div>
  );
}
