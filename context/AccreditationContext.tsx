"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

/**
 * Bumping this invalidates any cached acknowledgement and re-triggers the
 * accreditation gate modal for every wallet (issue #312's "new terms
 * version clears cached acknowledgement" requirement).
 */
export const ACCREDITATION_TERMS_VERSION = "2026-09-v1";

export interface AccreditationContextType {
  /** Whether the current session has completed all disclosure steps for the
   * terms version currently in effect. */
  isAcknowledged: boolean;
  /** Marks the current terms version as acknowledged for this session. */
  acknowledge: () => void;
}

const AccreditationContext = createContext<AccreditationContextType | undefined>(
  undefined
);

export interface AccreditationProviderProps {
  children: ReactNode;
}

export function AccreditationProvider({ children }: AccreditationProviderProps) {
  const [acknowledgedVersion, setAcknowledgedVersion] = useState<string | null>(
    null
  );

  const acknowledge = useCallback(() => {
    setAcknowledgedVersion(ACCREDITATION_TERMS_VERSION);
  }, []);

  const isAcknowledged = acknowledgedVersion === ACCREDITATION_TERMS_VERSION;

  return (
    <AccreditationContext.Provider value={{ isAcknowledged, acknowledge }}>
      {children}
    </AccreditationContext.Provider>
  );
}

export function useAccreditation(): AccreditationContextType {
  const context = useContext(AccreditationContext);
  if (!context) {
    throw new Error(
      "useAccreditation must be used within an AccreditationProvider"
    );
  }
  return context;
}
