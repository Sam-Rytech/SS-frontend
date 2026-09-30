"use client";

import { KycSubmissionForm } from "@/components/dashboard";
import { useSellerKycStatus } from "@/hooks/useSellerDashboard";

export default function KycReapplyPage() {
  const { data: kycStatus } = useSellerKycStatus();

  return (
    <main className="container mx-auto px-4 py-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Reapply for KYC Verification</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Your previous KYC was rejected. Please submit again with correct documents.
      </p>
      <KycSubmissionForm
        status="not_submitted"
        previousSubmission={kycStatus?.previousSubmission}
      />
    </main>
  );
}
