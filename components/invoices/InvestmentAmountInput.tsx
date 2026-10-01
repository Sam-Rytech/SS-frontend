"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { validateInvestmentAmount } from "@/lib/validation/investment-amount";

export interface InvestmentAmountInputProps {
    min: number;
    max: number;
    debounceMs?: number;
    onValidAmountChange?: (amount: number | null) => void;
    onErrorChange?: (error: string | null) => void;
}

export function InvestmentAmountInput({
    min,
    max,
    debounceMs = 200,
    onValidAmountChange,
    onErrorChange,
}: InvestmentAmountInputProps) {
    const [value, setValue] = useState("");
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Common multiples of the minimum investment
    const multipliers = [1, 2, 5, 10];

    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, []);

    function runValidation(rawValue: string) {
        if (rawValue.trim() === "") {
            setError(null);
            onErrorChange?.(null);
            onValidAmountChange?.(null);
            return;
        }

        const validationError = validateInvestmentAmount(rawValue, min, max);
        setError(validationError);
        onErrorChange?.(validationError);
        onValidAmountChange?.(validationError ? null : Number(rawValue));
    }

    function handleChange(rawValue: string) {
        setValue(rawValue);

        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        if (rawValue.trim() === "" || debounceMs <= 0) {
            runValidation(rawValue);
        } else {
            timerRef.current = setTimeout(() => {
                runValidation(rawValue);
            }, debounceMs);
        }
    }

    function handlePreset(amount: number) {
        const str = String(amount);
        setValue(str);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        // Presets populate the value and validate immediately
        runValidation(str);
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <Label htmlFor="investment-amount">Investment amount (XLM)</Label>
                <span className="text-xs text-muted-foreground" data-testid="min-investment-hint">
                    Min: {min} XLM
                </span>
            </div>
            <Input
                id="investment-amount"
                inputMode="decimal"
                placeholder={`${min} - ${max}`}
                value={value}
                aria-invalid={error !== null}
                aria-describedby={error ? "investment-amount-error" : undefined}
                className={cn(error && "border-destructive focus-visible:ring-destructive")}
                onChange={(e) => handleChange(e.target.value)}
            />

            {/* Preset buttons for minimum and common multiples of minimum */}
            <div className="flex flex-wrap gap-1.5" data-testid="investment-presets">
                {multipliers.map((mult) => {
                    const presetAmount = min * mult;
                    const isMin = mult === 1;
                    const isExceeding = presetAmount > max;
                    return (
                        <Button
                            key={mult}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={isExceeding}
                            data-testid={isMin ? "preset-min" : `preset-${mult}x`}
                            onClick={() => handlePreset(presetAmount)}
                        >
                            {isMin ? `Min (${presetAmount})` : `${mult}x (${presetAmount})`}
                        </Button>
                    );
                })}
            </div>

            {error && (
                <p
                    id="investment-amount-error"
                    role="alert"
                    className="text-sm text-destructive"
                    data-testid="investment-amount-error"
                >
                    {error}
                </p>
            )}
        </div>
    );
}
