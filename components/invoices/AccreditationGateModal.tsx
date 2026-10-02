"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAccreditation } from "@/context/AccreditationContext";

interface AccreditationStep {
  title: string;
  body: string;
}

const STEPS: AccreditationStep[] = [
  {
    title: "Risk Disclosure",
    body: "Investing in invoice-backed instruments carries risk, including partial or total loss of principal. Returns are not guaranteed.",
  },
  {
    title: "Platform Rules",
    body: "By investing, you agree to the platform's marketplace rules, including settlement timelines and dispute handling procedures.",
  },
  {
    title: "Accreditation Confirmation",
    body: "You confirm that you meet the accreditation requirements applicable to your jurisdiction for this type of investment.",
  },
];

interface AccreditationGateStepsProps {
  /** Called once every disclosure step has been completed. */
  onAcknowledged: () => void;
  /** Called when the wallet backs out before completing every step. */
  onCancel: () => void;
}

/**
 * Multi-step disclosure gate rendered in place of the investment form until
 * a wallet has acknowledged risk disclosure, platform rules, and
 * accreditation confirmation (issue #312). All steps must be completed
 * before the caller is allowed to proceed with an investment.
 */
export function AccreditationGateSteps({
  onAcknowledged,
  onCancel,
}: AccreditationGateStepsProps) {
  const { acknowledge } = useAccreditation();
  const [stepIndex, setStepIndex] = useState(0);

  const isLastStep = stepIndex === STEPS.length - 1;
  const step = STEPS[stepIndex];

  const handleNext = () => {
    if (isLastStep) {
      acknowledge();
      onAcknowledged();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(0, i - 1));
  };

  return (
    <Card className="border-0" data-testid="accreditation-gate-modal">
      <CardHeader>
        <CardTitle>{step.title}</CardTitle>
        <CardDescription>
          Step {stepIndex + 1} of {STEPS.length}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p
          className="text-sm text-muted-foreground"
          data-testid="accreditation-step-body"
        >
          {step.body}
        </p>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={stepIndex === 0 ? onCancel : handleBack}
          >
            {stepIndex === 0 ? "Cancel" : "Back"}
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1"
            data-testid="accreditation-step-next"
          >
            {isLastStep ? "Confirm & Continue" : "Next"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
