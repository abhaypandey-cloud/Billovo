import { GST } from '../types';

export interface GSTCalculation {
  cgst: number;
  sgst: number;
  igst: number;
  totalGST: number;
}

/**
 * Get GST rates for a specific state
 */
export const getGSTForState = (state: string, gstMasters: GST[]): GST | null => {
  return gstMasters.find(g => g.state.toLowerCase() === state.toLowerCase()) || null;
};

/**
 * Calculate GST for same state transaction (CGST + SGST)
 */
export const calculateIntraStateGST = (
  amount: number,
  cgstRate: number,
  sgstRate: number
): GSTCalculation => {
  const cgst = (amount * cgstRate) / 100;
  const sgst = (amount * sgstRate) / 100;
  const totalGST = cgst + sgst;

  return {
    cgst,
    sgst,
    igst: 0,
    totalGST,
  };
};

/**
 * Calculate GST for interstate transaction (IGST)
 */
export const calculateInterStateGST = (
  amount: number,
  igstRate: number
): GSTCalculation => {
  const igst = (amount * igstRate) / 100;

  return {
    cgst: 0,
    sgst: 0,
    igst,
    totalGST: igst,
  };
};

/**
 * Determine if transaction is intra-state or inter-state
 */
export const isIntraStateTransaction = (
  fromState: string,
  toState: string
): boolean => {
  return fromState.toLowerCase() === toState.toLowerCase();
};

/**
 * Calculate GST based on states and rates
 */
export const calculateGST = (
  amount: number,
  fromState: string,
  toState: string,
  gstMasters: GST[]
): GSTCalculation => {
  const isIntraState = isIntraStateTransaction(fromState, toState);
  const gstRate = getGSTForState(fromState, gstMasters);

  if (!gstRate) {
    return { cgst: 0, sgst: 0, igst: 0, totalGST: 0 };
  }

  if (isIntraState) {
    return calculateIntraStateGST(amount, gstRate.cgst, gstRate.sgst);
  } else {
    return calculateInterStateGST(amount, gstRate.igst);
  }
};

/**
 * Round amount to 2 decimal places
 */
export const roundAmount = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};
