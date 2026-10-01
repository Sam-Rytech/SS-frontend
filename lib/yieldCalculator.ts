/**
 * Yield calculator maths (issue #423).
 *
 * Pure helpers modelling simple (non-compounding) invoice returns:
 * gross interest accrues pro-rata over the tenor, the platform takes a
 * percentage fee off the gross, and the annualised yield rescales the net
 * return to a yearly figure.
 */

export const DEFAULT_PLATFORM_FEE_PERCENT = 1.5;
export const DAYS_PER_YEAR = 365;

export interface YieldCalculationInputs {
  /** Principal in XLM. */
  amount: number;
  /** Nominal annual yield rate in percent (e.g. 12 for 12%). */
  yieldRate: number;
  /** Tenor in days. */
  tenorDays: number;
  /** Platform fee as % of gross return. Defaults to 1.5. */
  feeRate?: number;
}

export interface YieldCalculationResult {
  grossReturn: number;
  platformFee: number;
  netReturn: number;
  totalPayout: number;
  annualisedYield: number;
}

function sanitise(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Gross interest before fees: principal × rate × (tenor / 365). */
export function calculateGrossReturn(
  amount: number,
  yieldRate: number,
  tenorDays: number
): number {
  const a = sanitise(amount);
  const r = sanitise(yieldRate);
  const t = sanitise(tenorDays);
  if (a === 0 || r === 0 || t === 0) return 0;
  return a * (r / 100) * (t / DAYS_PER_YEAR);
}

/** Platform fee deducted from the gross return. */
export function calculatePlatformFee(
  grossReturn: number,
  feeRate: number = DEFAULT_PLATFORM_FEE_PERCENT
): number {
  const g = Number.isFinite(grossReturn) && grossReturn > 0 ? grossReturn : 0;
  const f = Number.isFinite(feeRate) && feeRate > 0 ? feeRate : 0;
  return (g * f) / 100;
}

/**
 * Annualised yield from the net return:
 * (net / principal) × (365 / tenor) × 100.
 */
export function calculateAnnualisedYield(
  netReturn: number,
  amount: number,
  tenorDays: number
): number {
  const n = Number.isFinite(netReturn) ? netReturn : 0;
  const a = sanitise(amount);
  const t = sanitise(tenorDays);
  if (a === 0 || t === 0) return 0;
  return (n / a) * (DAYS_PER_YEAR / t) * 100;
}

export function calculateYield(inputs: YieldCalculationInputs): YieldCalculationResult {
  const feeRate = inputs.feeRate ?? DEFAULT_PLATFORM_FEE_PERCENT;
  const grossReturn = calculateGrossReturn(inputs.amount, inputs.yieldRate, inputs.tenorDays);
  const platformFee = calculatePlatformFee(grossReturn, feeRate);
  const netReturn = Math.max(0, grossReturn - platformFee);
  const amount = sanitise(inputs.amount);
  return {
    grossReturn,
    platformFee,
    netReturn,
    totalPayout: amount + netReturn,
    annualisedYield: calculateAnnualisedYield(netReturn, amount, inputs.tenorDays),
  };
}

/** Preset principal buttons shown above the amount input. */
export const YIELD_PRESET_AMOUNTS = [1000, 5000, 10000, 50000] as const;
