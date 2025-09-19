/// <reference types="vite/client" />
import axios, { AxiosHeaders, RawAxiosRequestHeaders } from "axios";
import { endpoints } from "./endpoints";

const VITE_BASE: string | undefined =
  (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_API_BASE) || undefined;

const baseURL =
  VITE_BASE ??
  // dev fallback for Vite preview/serve ports
  ((typeof window !== "undefined" && /:(5173|3000)$/.test(window.location.origin))
    ? "http://localhost:8080"
    : "");

const client = axios.create({ baseURL, withCredentials: false });

function setHdr(headers: any, key: string, val?: string | null) {
  if (!val || val === "null" || val === "undefined") return;
  if (typeof headers?.set === "function") {
    headers.set(key, val);
  } else {
    (headers as RawAxiosRequestHeaders)[key] = val;
  }
}

function delHdr(headers: any, key: string) {
  if (typeof headers?.delete === "function") {
    headers.delete(key);
  } else if (headers) {
    delete (headers as RawAxiosRequestHeaders)[key];
  }
}

client.interceptors.request.use((config) => {
  const abs = new URL((config.url || ""), (config.baseURL || baseURL || (typeof window !== "undefined" ? window.location.origin : "http://localhost")));
  const path = abs.pathname;

  const isPublicAuth =
    path.startsWith(endpoints.auth.login) || path.startsWith(endpoints.auth.register);

  if (!config.headers) config.headers = new AxiosHeaders() as any;

  // Authorization token (all protected endpoints)
  if (!isPublicAuth) {
    let token = localStorage.getItem("auth.token");
    if (!token) {
      try { token = JSON.parse(localStorage.getItem("ipachi_user") || "{}").token; } catch {}
    }
    setHdr(config.headers, "Authorization", token ? `Bearer ${token}` : undefined);

    // Multi-tenant scoping headers
    const activeUserId = localStorage.getItem("activeUserId");
    const activeTerminalId = localStorage.getItem("activeTerminalId");
    setHdr(config.headers, "X-User-Id", activeUserId || undefined);
    setHdr(config.headers, "X-Terminal-Id", activeTerminalId || undefined);
  } else {
    // Ensure public auth calls are clean of protected headers
    delHdr(config.headers, "Authorization");
    delHdr(config.headers, "X-User-Id");
    delHdr(config.headers, "X-Terminal-Id");
  }
  return config;
});

export const api = client;
// some files import `client`, so export it too
export default client;

export const setAuthToken = (token: string | null) => {
  if (token && token !== "null" && token !== "undefined") localStorage.setItem("auth.token", token);
  else localStorage.removeItem("auth.token");
};
