"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { submitKyc } from "@/lib/api";
import type { SellerKycSubmission } from "@/lib/api";
import type { KycStatus } from "./KycStatusBanner";

const COUNTRIES = [
  "United States",
  "Canada",
  "United Kingdom",
  "Germany",
  "France",
  "Australia",
  "Japan",
  "Singapore",
  "India",
  "Brazil",
];

const ID_TYPES = ["Passport", "Driver's License", "National ID Card"];

const kycSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  country: z.string().min(1, "Country is required"),
  idType: z.string().min(1, "Government ID type is required"),
});

type KycFormData = z.infer<typeof kycSchema>;

interface KycSubmissionFormProps {
  status: KycStatus;
  previousSubmission?: SellerKycSubmission | null;
}

export function KycSubmissionForm({
  status,
  previousSubmission,
}: KycSubmissionFormProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<KycFormData>({
    resolver: zodResolver(kycSchema),
    defaultValues: {
      fullName: previousSubmission?.fullName ?? "",
      country: previousSubmission?.country ?? "",
      idType: previousSubmission?.idType ?? "",
    },
  });

  const idTypeValue = watch("idType");

  const isPending = status === "pending";

  const onFileSelected = useCallback((f: File) => {
    setFile(f);
  }, []);

  const onSubmit = useCallback(
    async (data: KycFormData) => {
      if (!file) {
        toast.error("Please upload a document");
        return;
      }

      setIsSubmitting(true);
      setUploadProgress(0);

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(interval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      try {
        const formData = new FormData();
        formData.append("full_name", data.fullName);
        formData.append("country", data.country);
        formData.append("id_type", data.idType);
        formData.append("document", file);

        await submitKyc(formData);
        clearInterval(interval);
        setUploadProgress(100);
        setTimeout(() => router.push("/kyc/confirmed"), 300);
      } catch {
        clearInterval(interval);
        setUploadProgress(0);
        toast.error("Failed to submit KYC. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [file, router],
  );

  if (isPending) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Already submitted</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="full-name">Full Name</Label>
        <Input
          id="full-name"
          placeholder="Enter your full name"
          {...register("fullName")}
        />
        {errors.fullName && (
          <p className="text-sm text-destructive">{errors.fullName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="country">Country</Label>
        <Select
          defaultValue={previousSubmission?.country || undefined}
          onValueChange={(v) => setValue("country", v, { shouldValidate: true })}
        >
          <SelectTrigger id="country">
            <SelectValue placeholder="Select your country" />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.country && (
          <p className="text-sm text-destructive">{errors.country.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="id-type">Government ID Type</Label>
        <Select
          defaultValue={previousSubmission?.idType || undefined}
          onValueChange={(v) => setValue("idType", v, { shouldValidate: true })}
        >
          <SelectTrigger id="id-type">
            <SelectValue placeholder="Select ID type" />
          </SelectTrigger>
          <SelectContent>
            {ID_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.idType && (
          <p className="text-sm text-destructive">{errors.idType.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="document-upload">Document</Label>
        <Input
          id="document-upload"
          type="file"
          accept=".pdf,image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileSelected(f);
          }}
        />
      </div>

      {uploadProgress > 0 && (
        <div className="space-y-1">
          <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Uploading... {uploadProgress}%
          </p>
        </div>
      )}

      <Button type="submit" disabled={isSubmitting || !idTypeValue}>
        {isSubmitting ? "Submitting..." : "Submit KYC"}
      </Button>
    </form>
  );
}
