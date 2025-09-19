// src/api/tills.ts
import { api } from "./client";
import { endpoints } from "./endpoints";
import {
  type TillSession,
  type TillSummary,
  type OpenTillRequest,
  type MovementRequest,
  type CloseTillRequest,
} from "../types/till";

// Use the complete endpoints.till object
const tillEndpoints = endpoints.till;

// Helper function to safely build URLs
const buildTillUrl = (path: string, id?: string | number): string => {
  if (!id) return path;
  return path.replace(`{id}`, id.toString());
};

// Specific path builders
const activePath = (): string => tillEndpoints.active;
const openPath = (): string => tillEndpoints.open;
const summaryPath = (id: number | string): string => buildTillUrl(tillEndpoints.summary(id), id.toString());
const closePath = (id: number | string): string => buildTillUrl(tillEndpoints.close(id), id.toString());
const cashInPath = (id: number | string): string => buildTillUrl(tillEndpoints.cashIn(id), id.toString());
const cashOutPath = (id: number | string): string => buildTillUrl(tillEndpoints.cashOut(id), id.toString());
const salePath = (id: number | string): string => buildTillUrl(tillEndpoints.recordSale(id), id.toString());
const refundPath = (id: number | string): string => buildTillUrl(tillEndpoints.refund(id), id.toString());

// ---------- API calls ----------
export async function openTill(body: OpenTillRequest): Promise<TillSession> {
  console.log("🔓 Opening till:", body);
  try {
    const { data } = await api.post<TillSession>(openPath(), body, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("✅ Till opened:", data);
    return data;
  } catch (error: any) {
    console.error("❌ Failed to open till:", error);
    throw error;
  }
}

export async function getActiveTill(terminalId: string | number): Promise<TillSession | null> {
  console.log("🔍 Getting active till for terminal:", terminalId);
  try {
    const { data } = await api.get<TillSession | null>(activePath(), {
      params: { terminalId },
      headers: { "Content-Type": "application/json" },
    });
    console.log("✅ Active till:", data);
    return data;
  } catch (error: any) {
    console.error("❌ Failed to get active till:", error);
    throw error;
  }
}

export async function getTillSummary(tillId: number | string): Promise<TillSummary> {
  console.log("📊 Getting till summary for ID:", tillId);
  try {
    const { data } = await api.get<TillSummary>(summaryPath(tillId), {
      headers: { "Content-Type": "application/json" },
    });
    console.log("✅ Till summary:", data);
    return data;
  } catch (error: any) {
    console.error("❌ Failed to get till summary:", error);
    throw error;
  }
}

export async function closeTill(tillId: number | string, body: CloseTillRequest): Promise<TillSession> {
  console.log("🔒 Closing till:", tillId, body);
  try {
    const { data } = await api.post<TillSession>(closePath(tillId), body, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("✅ Till closed:", data);
    return data;
  } catch (error: any) {
    console.error("❌ Failed to close till:", error);
    throw error;
  }
}

export async function cashIn(tillId: number, body: MovementRequest): Promise<TillSession> {
  console.log("💵 Cash in to till:", tillId, body);
  try {
    const { data } = await api.post(cashInPath(tillId), body, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("✅ Cash in recorded:", data);
    return data;
  } catch (error: any) {
    console.error("❌ Failed to record cash in:", error);
    throw error;
  }
}

export async function cashOut(tillId: number, body: MovementRequest): Promise<TillSession> {
  console.log("💸 Cash out from till:", tillId, body);
  try {
    const { data } = await api.post(cashOutPath(tillId), body, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("✅ Cash out recorded:", data);
    return data;
  } catch (error: any) {
    console.error("❌ Failed to record cash out:", error);
    throw error;
  }
}

export async function recordSale(tillId: number, body: MovementRequest): Promise<TillSession> {
  console.log("🛒 Recording sale for till:", tillId, body);
  try {
    const { data } = await api.post(salePath(tillId), body, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("✅ Sale recorded:", data);
    return data;
  } catch (error: any) {
    console.error("❌ Failed to record sale:", error);
    throw error;
  }
}

export async function refund(tillId: number, body: MovementRequest): Promise<TillSession> {
  console.log("🔄 Processing refund for till:", tillId, body);
  try {
    const { data } = await api.post(refundPath(tillId), body, {
      headers: { "Content-Type": "application/json" },
    });
    console.log("✅ Refund processed:", data);
    return data;
  } catch (error: any) {
    console.error("❌ Failed to process refund:", error);
    throw error;
  }
}

// Export API object for backward compatibility
export const TillsApi = {
  open: openTill,
  active: getActiveTill,
  cashIn,
  cashOut,
  recordSale,
  refund,
  summary: getTillSummary,
  close: closeTill,
};

// Default export
export default TillsApi;