"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { submitBusinessKyc, fetchKycStatus, uploadDocument, type KycSubmission, type KycStatus } from "@/lib/api";
import { toast } from "sonner";

export function useKycStatus() {
  return useQuery({
    queryKey: ["kyc", "status"],
    queryFn: fetchKycStatus,
  });
}

export function useKycSubmit() {
  return useMutation({
    mutationFn: submitBusinessKyc,
    onSuccess: () => {
      toast.success("KYC submitted successfully. Your application is under review.");
    },
    onError: () => {
      toast.error("Failed to submit KYC. Please try again.");
    },
  });
}

export function useDocumentUpload() {
  return useMutation({
    mutationFn: uploadDocument,
    onError: () => {
      toast.error("Failed to upload document. Please try again.");
    },
  });
}

export type KycStep = 1 | 2 | 3 | 4;

export interface KycFormData {
  businessDetails: {
    company_name: string;
    registration_number: string;
    country: string;
    address: string;
  };
  directorDetails: {
    name: string;
    id_document_url: string;
    date_of_birth: string;
  };
  regulatoryDocuments: {
    certificate_of_incorporation_url: string;
    tax_id_url: string;
    bank_statement_url: string;
  };
}

export const initialKycFormData: KycFormData = {
  businessDetails: {
    company_name: "",
    registration_number: "",
    country: "",
    address: "",
  },
  directorDetails: {
    name: "",
    id_document_url: "",
    date_of_birth: "",
  },
  regulatoryDocuments: {
    certificate_of_incorporation_url: "",
    tax_id_url: "",
    bank_statement_url: "",
  },
};

export function validateStep(step: KycStep, data: KycFormData): string[] {
  const errors: string[] = [];

  switch (step) {
    case 1:
      if (!data.businessDetails.company_name.trim()) errors.push("Company name is required");
      if (!data.businessDetails.registration_number.trim()) errors.push("Registration number is required");
      if (!data.businessDetails.country.trim()) errors.push("Country is required");
      if (!data.businessDetails.address.trim()) errors.push("Address is required");
      break;
    case 2:
      if (!data.directorDetails.name.trim()) errors.push("Director name is required");
      if (!data.directorDetails.id_document_url.trim()) errors.push("ID document is required");
      if (!data.directorDetails.date_of_birth.trim()) errors.push("Date of birth is required");
      break;
    case 3:
      if (!data.regulatoryDocuments.certificate_of_incorporation_url.trim()) errors.push("Certificate of incorporation is required");
      if (!data.regulatoryDocuments.tax_id_url.trim()) errors.push("Tax ID document is required");
      if (!data.regulatoryDocuments.bank_statement_url.trim()) errors.push("Bank statement is required");
      break;
    case 4:
      break;
  }

  return errors;
}