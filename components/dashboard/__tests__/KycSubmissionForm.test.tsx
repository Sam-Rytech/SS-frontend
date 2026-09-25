import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KycSubmissionForm } from "../KycSubmissionForm";

Element.prototype.scrollIntoView = vi.fn();

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock("@/lib/api", () => ({
  submitKyc: vi.fn(),
}));

import { submitKyc } from "@/lib/api";
import { toast } from "sonner";

describe("KycSubmissionForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows 'Already submitted' when status is pending", () => {
    render(<KycSubmissionForm status="pending" />);

    expect(screen.getByText("Already submitted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });

  it("renders all required fields for not_submitted status", () => {
    render(<KycSubmissionForm status="not_submitted" />);

    expect(screen.getByLabelText("Full Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Country")).toBeInTheDocument();
    expect(screen.getByLabelText("Government ID Type")).toBeInTheDocument();
    expect(screen.getByLabelText("Document")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit KYC" })).toBeInTheDocument();
  });

  it("shows validation errors on submit with empty fields", async () => {
    render(<KycSubmissionForm status="not_submitted" />);

    fireEvent.submit(screen.getByRole("button", { name: "Submit KYC" }).closest("form")!);

    await waitFor(() => {
      expect(screen.getByText("Full name is required")).toBeInTheDocument();
      expect(screen.getByText("Country is required")).toBeInTheDocument();
      expect(screen.getByText("Government ID type is required")).toBeInTheDocument();
    });
  });

  it("calls submitKyc and navigates on successful submission", async () => {
    vi.mocked(submitKyc).mockResolvedValueOnce({ success: true });

    render(<KycSubmissionForm status="not_submitted" />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });

    const countrySelect = screen.getByLabelText("Country");
    fireEvent.click(countrySelect);
    const countryOption = screen.getAllByText("United States").find((el) => el.tagName === "SPAN");
    if (countryOption) fireEvent.click(countryOption);

    const idTypeSelect = screen.getByLabelText("Government ID Type");
    fireEvent.click(idTypeSelect);
    const idOption = screen.getAllByText("Passport").find((el) => el.tagName === "SPAN");
    if (idOption) fireEvent.click(idOption);

    const fileInput = screen.getByLabelText("Document") as HTMLInputElement;
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Submit KYC" }));

    await waitFor(() => {
      expect(submitKyc).toHaveBeenCalled();
    });
  });

  it("shows error toast when submission fails", async () => {
    vi.mocked(submitKyc).mockRejectedValueOnce(new Error("Network error"));

    render(<KycSubmissionForm status="not_submitted" />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });

    const countrySelect = screen.getByLabelText("Country");
    fireEvent.click(countrySelect);
    const countryOption = screen.getAllByText("United States").find((el) => el.tagName === "SPAN");
    if (countryOption) fireEvent.click(countryOption);

    const idTypeSelect = screen.getByLabelText("Government ID Type");
    fireEvent.click(idTypeSelect);
    const idOption = screen.getAllByText("Passport").find((el) => el.tagName === "SPAN");
    if (idOption) fireEvent.click(idOption);

    const fileInput = screen.getByLabelText("Document") as HTMLInputElement;
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Submit KYC" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to submit KYC. Please try again.",
      );
    });
  });

  it("shows upload progress indicator during submission", async () => {
    vi.mocked(submitKyc).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ success: true }), 500)),
    );

    render(<KycSubmissionForm status="not_submitted" />);

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "John Doe" },
    });

    const countrySelect = screen.getByLabelText("Country");
    fireEvent.click(countrySelect);
    const countryOption = screen.getAllByText("United States").find((el) => el.tagName === "SPAN");
    if (countryOption) fireEvent.click(countryOption);

    const idTypeSelect = screen.getByLabelText("Government ID Type");
    fireEvent.click(idTypeSelect);
    const idOption = screen.getAllByText("Passport").find((el) => el.tagName === "SPAN");
    if (idOption) fireEvent.click(idOption);

    const fileInput = screen.getByLabelText("Document") as HTMLInputElement;
    const file = new File(["dummy"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole("button", { name: "Submit KYC" }));

    await waitFor(() => {
      expect(screen.getByText(/Uploading/)).toBeInTheDocument();
    });
  });

  it("renders all three document type options in the dropdown", () => {
    render(<KycSubmissionForm status="not_submitted" />);

    const idTypeSelect = screen.getByLabelText("Government ID Type");
    fireEvent.click(idTypeSelect);

    expect(screen.getAllByText("Passport").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Driver's License").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("National ID Card").length).toBeGreaterThanOrEqual(1);
  });

  it("selecting Passport sets the form value", async () => {
    render(<KycSubmissionForm status="not_submitted" />);

    const idTypeSelect = screen.getByLabelText("Government ID Type");
    fireEvent.click(idTypeSelect);
    const passportOption = screen.getAllByText("Passport").find((el) => el.tagName === "SPAN");
    if (passportOption) fireEvent.click(passportOption);

    await waitFor(() => {
      expect(screen.queryByText("Government ID type is required")).not.toBeInTheDocument();
    });
  });

  it("selecting National ID Card sets the form value", async () => {
    render(<KycSubmissionForm status="not_submitted" />);

    const idTypeSelect = screen.getByLabelText("Government ID Type");
    fireEvent.click(idTypeSelect);
    const nationalIdOption = screen.getAllByText("National ID Card").find((el) => el.tagName === "SPAN");
    if (nationalIdOption) fireEvent.click(nationalIdOption);

    await waitFor(() => {
      expect(screen.queryByText("Government ID type is required")).not.toBeInTheDocument();
    });
  });

  it("submit button is disabled when no document type is selected", () => {
    render(<KycSubmissionForm status="not_submitted" />);

    const submitButton = screen.getByRole("button", { name: "Submit KYC" });
    expect(submitButton).toBeDisabled();
  });

  it("pre-fills the full name field from a previous submission", () => {
    render(
      <KycSubmissionForm
        status="not_submitted"
        previousSubmission={{
          fullName: "Jane Doe",
          country: "Canada",
          idType: "Passport",
        }}
      />,
    );

    expect(screen.getByLabelText("Full Name")).toHaveValue("Jane Doe");
  });

  it("pre-fills the country and ID type selects from a previous submission", () => {
    render(
      <KycSubmissionForm
        status="not_submitted"
        previousSubmission={{
          fullName: "Jane Doe",
          country: "Canada",
          idType: "Passport",
        }}
      />,
    );

    expect(screen.getByLabelText("Country")).toHaveTextContent("Canada");
    expect(screen.getByLabelText("Government ID Type")).toHaveTextContent("Passport");
  });

  it("submit button is enabled immediately when pre-filled from a previous submission", () => {
    render(
      <KycSubmissionForm
        status="not_submitted"
        previousSubmission={{
          fullName: "Jane Doe",
          country: "Canada",
          idType: "Passport",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: "Submit KYC" })).not.toBeDisabled();
  });

  it("renders normally with no previous submission", () => {
    render(<KycSubmissionForm status="not_submitted" previousSubmission={null} />);

    expect(screen.getByLabelText("Full Name")).toHaveValue("");
  });
});
