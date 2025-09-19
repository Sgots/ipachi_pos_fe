// src/types/till.ts
export type TillSessionStatus = "OPEN" | "CLOSED" | "PENDING";

export type TillSession = {
  id: number;
  terminalId: number;
  openedByUserId: number;
  openedAt: string; // ISO
  openingFloat: number;
  status: TillSessionStatus;
  closedAt?: string | null;
  closingCashActual?: number | null;
  expectedCash?: number | null;
  overShort?: number | null;
  notes?: string | null;
};

export type TillSummary = {
  tillId: number;
  openingFloat: number;    // Added missing property
  expectedCash: number;
  salesTotal: number;      // Added missing property
  cashIn?: number;         // Added missing property
  cashOut?: number;        // Added missing property
  refunds?: number;        // Added missing property
  payouts?: number;        // Added missing property
  closingCashActual?: number; // Added missing property
  overShort?: number;      // Added missing property
  // add more fields as your backend provides
};

export type OpenTillRequest = {
  terminalId: number;
  openedByUserId: number;
  openingFloat: number;
  notes?: string;
};

export type MovementRequest = {
  amount: number;
  notes?: string;
  reference?: string;
};

export type CloseTillRequest = {
  closingCashActual: number;
  expectedCash?: number;
  notes?: string;
};