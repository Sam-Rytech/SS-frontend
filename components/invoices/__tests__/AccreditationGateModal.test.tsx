import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { AccreditationGateSteps } from "../AccreditationGateModal";
import { AccreditationProvider } from "@/context/AccreditationContext";

function renderGate(onAcknowledged = vi.fn(), onCancel = vi.fn()) {
  render(
    <AccreditationProvider>
      <AccreditationGateSteps
        onAcknowledged={onAcknowledged}
        onCancel={onCancel}
      />
    </AccreditationProvider>
  );
  return { onAcknowledged, onCancel };
}

describe("AccreditationGateSteps", () => {
  it("starts on the risk disclosure step", () => {
    renderGate();
    expect(screen.getByText("Risk Disclosure")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();
  });

  it("requires all three steps before calling onAcknowledged", () => {
    const { onAcknowledged } = renderGate();

    fireEvent.click(screen.getByTestId("accreditation-step-next"));
    expect(screen.getByText("Platform Rules")).toBeInTheDocument();
    expect(onAcknowledged).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("accreditation-step-next"));
    expect(screen.getByText("Accreditation Confirmation")).toBeInTheDocument();
    expect(onAcknowledged).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("accreditation-step-next"));
    expect(onAcknowledged).toHaveBeenCalledTimes(1);
  });

  it("allows navigating back to a previous step", () => {
    renderGate();

    fireEvent.click(screen.getByTestId("accreditation-step-next"));
    expect(screen.getByText("Platform Rules")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("Risk Disclosure")).toBeInTheDocument();
  });

  it("calls onCancel from the first step instead of navigating back", () => {
    const { onCancel } = renderGate();

    fireEvent.click(screen.getByText("Cancel"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
