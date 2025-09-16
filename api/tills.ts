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

// ---------- Endpoint bases ----------
const TILLS_BASE = endpoints.tills?.base ?? "/api/tills";

const activePath = () =>
  endpoints.tills?.active ?? `${TILLS_BASE}/active`;

const cashInPath = (id: number) =>
  endpoints.tills?.cashIn?.(id) ?? `${TILLS_BASE}/${id}/cash-in`;

const cashOutPath = (id: number) =>
  endpoints.tills?.cashOut?.(id) ?? `${TILLS_BASE}/${id}/cash-out`;

const salePath = (id: number) =>
  endpoints.tills?.recordSale?.(id) ?? `${TILLS_BASE}/${id}/record-sale`;

const refundPath = (id: number) =>
  endpoints.tills?.refund?.(id) ?? `${TILLS_BASE}/${id}/refund`;

const summaryPath = (id: number) =>
  endpoints.tills?.summary?.(id) ?? `${TILLS_BASE}/${id}/summary`;

const closePath = (id: number) =>
  endpoints.tills?.close?.(id) ?? `${TILLS_BASE}/${id}/close`;

// If you want to override /open via endpoints.tills?.open, wire it here:
const openPath = () =>
  endpoints.tills?.open ?? `${TILLS_BASE}/open`;

// ---------- API calls ----------
export async function openTill(body: OpenTillRequest) {
  const { data } = await api.post<TillSession>(openPath(), body, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}

export async function getActiveTill(terminalId: string) {
  // Use query params to match the project style
  const { data } = await api.get<TillSession | null>(activePath(), {
    params: { terminalId },
  });
  return data;
}

export async function cashIn(tillId: number, body: MovementRequest) {
  const { data } = await api.post(cashInPath(tillId), body, {
    headers: { "Content-Type": "application/json" },
  });
  return data as unknown as { /* server returns movement row */ id: number };
}

export async function cashOut(tillId: number, body: MovementRequest) {
  const { data } = await api.post(cashOutPath(tillId), body, {
    headers: { "Content-Type": "application/json" },
  });
  return data as unknown as { id: number };
}

export async function recordSale(tillId: number, body: MovementRequest) {
  const { data } = await api.post(salePath(tillId), body, {
    headers: { "Content-Type": "application/json" },
  });
  return data as unknown as { id: number };
}

export async function refund(tillId: number, body: MovementRequest) {
  const { data } = await api.post(refundPath(tillId), body, {
    headers: { "Content-Type": "application/json" },
  });
  return data as unknown as { id: number };
}

export async function getTillSummary(tillId: number) {
  const { data } = await api.get<TillSummary>(summaryPath(tillId));
  return data;
}

export async function closeTill(tillId: number, body: CloseTillRequest) {
  const { data } = await api.post<TillSession>(closePath(tillId), body, {
    headers: { "Content-Type": "application/json" },
  });
  return data;
}
// ---- Back-compat shim for older imports ----
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
