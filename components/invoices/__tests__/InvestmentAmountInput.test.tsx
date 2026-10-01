import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { InvestmentAmountInput } from "../InvestmentAmountInput";

describe("InvestmentAmountInput (#436)", () => {
    const min = 100;
    const max = 5000;

    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("displays the minimum investment hint", () => {
        render(<InvestmentAmountInput min={min} max={max} />);
        expect(screen.getByTestId("min-investment-hint")).toHaveTextContent("Min: 100 XLM");
    });

    it("debounces validation correctly at 200ms when typing below minimum", () => {
        const onErrorChange = vi.fn();
        const onValidAmountChange = vi.fn();

        render(
            <InvestmentAmountInput
                min={min}
                max={max}
                onErrorChange={onErrorChange}
                onValidAmountChange={onValidAmountChange}
            />
        );

        fireEvent.change(screen.getByLabelText("Investment amount (XLM)"), {
            target: { value: "50" },
        });

        // Immediately after change: validation hasn't run yet
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(onErrorChange).not.toHaveBeenCalled();

        // Advance 100ms: still debouncing
        act(() => {
            vi.advanceTimersByTime(100);
        });
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();

        // Advance remaining 100ms (total 200ms): validation fires
        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(screen.getByRole("alert")).toHaveTextContent(`Minimum investment is ${min} XLM`);
        expect(onErrorChange).toHaveBeenCalledWith(`Minimum investment is ${min} XLM`);
        expect(onValidAmountChange).toHaveBeenCalledWith(null);
    });

    it("shows an inline error when the amount exceeds available capacity after debounce", () => {
        render(<InvestmentAmountInput min={min} max={max} />);

        fireEvent.change(screen.getByLabelText("Investment amount (XLM)"), {
            target: { value: "5001" },
        });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(screen.getByRole("alert")).toHaveTextContent("Amount exceeds available capacity");
    });

    it("shows no error and reports valid amount for value within range after debounce", () => {
        const onValidAmountChange = vi.fn();
        render(
            <InvestmentAmountInput min={min} max={max} onValidAmountChange={onValidAmountChange} />
        );

        fireEvent.change(screen.getByLabelText("Investment amount (XLM)"), {
            target: { value: "2500" },
        });

        act(() => {
            vi.advanceTimersByTime(200);
        });

        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
        expect(onValidAmountChange).toHaveBeenLastCalledWith(2500);
    });

    it("resets debounce timer on rapid keystrokes", () => {
        const onValidAmountChange = vi.fn();
        render(
            <InvestmentAmountInput min={min} max={max} onValidAmountChange={onValidAmountChange} />
        );

        const input = screen.getByLabelText("Investment amount (XLM)");

        fireEvent.change(input, { target: { value: "10" } });
        act(() => {
            vi.advanceTimersByTime(150);
        });
        // Keystroke before 200ms
        fireEvent.change(input, { target: { value: "100" } });
        act(() => {
            vi.advanceTimersByTime(150);
        });

        // Total 300ms elapsed since start, but only 150ms since last change -> not fired yet
        expect(onValidAmountChange).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(50);
        });

        // Now 200ms elapsed since last keystroke ("100") -> fired with valid 100
        expect(onValidAmountChange).toHaveBeenCalledWith(100);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("renders preset buttons for minimum and common multiples", () => {
        render(<InvestmentAmountInput min={min} max={max} />);

        expect(screen.getByTestId("preset-min")).toHaveTextContent("Min (100)");
        expect(screen.getByTestId("preset-2x")).toHaveTextContent("2x (200)");
        expect(screen.getByTestId("preset-5x")).toHaveTextContent("5x (500)");
        expect(screen.getByTestId("preset-10x")).toHaveTextContent("10x (1000)");
    });

    it("populates and validates correct multiples of minimum when preset buttons are clicked", () => {
        const onValidAmountChange = vi.fn();
        render(
            <InvestmentAmountInput min={min} max={max} onValidAmountChange={onValidAmountChange} />
        );

        const input = screen.getByLabelText("Investment amount (XLM)");

        // Click 2x preset
        fireEvent.click(screen.getByTestId("preset-2x"));
        expect(input).toHaveValue("200");
        expect(onValidAmountChange).toHaveBeenCalledWith(200);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();

        // Click Min preset
        fireEvent.click(screen.getByTestId("preset-min"));
        expect(input).toHaveValue("100");
        expect(onValidAmountChange).toHaveBeenCalledWith(100);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();

        // Click 10x preset
        fireEvent.click(screen.getByTestId("preset-10x"));
        expect(input).toHaveValue("1000");
        expect(onValidAmountChange).toHaveBeenCalledWith(1000);
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("disables preset buttons that exceed capacity", () => {
        render(<InvestmentAmountInput min={500} max={800} />);

        expect(screen.getByTestId("preset-min")).toBeEnabled(); // 500 <= 800
        expect(screen.getByTestId("preset-2x")).toBeDisabled(); // 1000 > 800
        expect(screen.getByTestId("preset-5x")).toBeDisabled(); // 2500 > 800
        expect(screen.getByTestId("preset-10x")).toBeDisabled(); // 5000 > 800
    });

    it("clears error immediately when field is emptied", () => {
        render(<InvestmentAmountInput min={min} max={max} />);
        const input = screen.getByLabelText("Investment amount (XLM)");

        fireEvent.change(input, { target: { value: "50" } });
        act(() => {
            vi.advanceTimersByTime(200);
        });
        expect(screen.getByRole("alert")).toBeInTheDocument();

        fireEvent.change(input, { target: { value: "" } });
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
});
