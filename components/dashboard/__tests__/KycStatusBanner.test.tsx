import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { KycStatusBanner } from "../KycStatusBanner";

describe("KycStatusBanner", () => {
    it("renders a pending review banner with a link to KYC status", () => {
        render(<KycStatusBanner status="pending" />);

        expect(
            screen.getByText("Your KYC submission is under review.")
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "View status" })).toHaveAttribute(
            "href",
            "/kyc/status"
        );
    });

    it("renders the rejected message with reason and a Go to KYC link", () => {
        render(<KycStatusBanner status="rejected" reason="Missing document" />);

        expect(
            screen.getByText("Your KYC was rejected. Reason: Missing document. Please resubmit.")
        ).toBeInTheDocument();
        const link = screen.getByRole("link", { name: "Go to KYC" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/kyc/reapply");
    });

    it("renders the requires resubmission message with a Go to KYC link", () => {
        render(<KycStatusBanner status="requires_resubmission" />);

        expect(
            screen.getByText("Additional documents required. Please update your KYC.")
        ).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Go to KYC" })).toHaveAttribute(
            "href",
            "/kyc/reapply"
        );
    });

    it("renders a verified badge when approved", () => {
        render(<KycStatusBanner status="approved" />);

        expect(screen.getByText("Verified seller")).toBeInTheDocument();
        expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("renders the not submitted message with a Start KYC button", () => {
        render(<KycStatusBanner status="not_submitted" />);

        expect(screen.getByText("Complete KYC to publish invoices")).toBeInTheDocument();
        const link = screen.getByRole("link", { name: "Start KYC" });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/kyc/start");
    });

    it("navigates the rejected Go to KYC link to the correct route", () => {
        render(<KycStatusBanner status="rejected" />);

        expect(screen.getByRole("link", { name: "Go to KYC" })).toHaveAttribute(
            "href",
            "/kyc/reapply"
        );
    });

    it("navigates the Start KYC button to the correct route", () => {
        render(<KycStatusBanner status="not_submitted" />);

        expect(screen.getByRole("link", { name: "Start KYC" })).toHaveAttribute(
            "href",
            "/kyc/start"
        );
    });
});
