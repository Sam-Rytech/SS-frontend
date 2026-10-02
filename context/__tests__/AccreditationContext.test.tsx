import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import React from "react";
import {
  AccreditationProvider,
  useAccreditation,
} from "../AccreditationContext";

function wrapper({ children }: { children: React.ReactNode }) {
  return <AccreditationProvider>{children}</AccreditationProvider>;
}

describe("AccreditationContext", () => {
  it("starts unacknowledged for a fresh session", () => {
    const { result } = renderHook(() => useAccreditation(), { wrapper });
    expect(result.current.isAcknowledged).toBe(false);
  });

  it("marks the current terms version acknowledged after acknowledge() is called", () => {
    const { result } = renderHook(() => useAccreditation(), { wrapper });

    act(() => {
      result.current.acknowledge();
    });

    expect(result.current.isAcknowledged).toBe(true);
  });

  it("stays acknowledged across re-renders within the same session", () => {
    const { result, rerender } = renderHook(() => useAccreditation(), {
      wrapper,
    });

    act(() => {
      result.current.acknowledge();
    });
    rerender();

    expect(result.current.isAcknowledged).toBe(true);
  });

  it("throws when used outside of an AccreditationProvider", () => {
    const { result } = renderHook(() => {
      try {
        return useAccreditation();
      } catch (err) {
        return err;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toMatch(
      /must be used within an AccreditationProvider/
    );
  });
});
