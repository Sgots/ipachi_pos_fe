/// <reference types="vite/client" />
import axios, { AxiosHeaders, RawAxiosRequestHeaders } from "axios";
import { endpoints } from "./endpoints";

// Resolve base URL: prefer Vite env, else dev-friendly localhost for Vite ports.
const VITE_BASE: string | undefined =
  (typeof import.meta !== "undefined" && (import.meta as any)?.env?.VITE_API_BASE) || undefined;

const baseURL =
  VITE_BASE ??
  ((typeof window !== "undefined" && /:(5173|3000)$/.test(window.location.origin))
    ? "http://localhost:8080"
    : "");

// Axios instance
const client = axios.create({ baseURL, withCredentials: false });

/** Helpers to manage IDs (no hardcoded defaults) */
export const setAuthToken = (token: string | null) => {
  if (token && token !== "null" && token !== "undefined") {
    localStorage.setItem("auth.token", token);
  } else {
    localStorage.removeItem("auth.token");
  }
};

export const setUserId = (userId: number | string | null | undefined) => {
  if (userId === null || userId === undefined || `${userId}`.trim() === "") {
    localStorage.removeItem("x.user.id");
  } else {
    localStorage.setItem("x.user.id", String(userId));
  }
};

export const setTerminalId = (terminalId: number | string | null | undefined) => {
  if (terminalId === null || terminalId === undefined || `${terminalId}`.trim() === "") {
    localStorage.removeItem("x.terminal.id");
  } else {
    localStorage.setItem("x.terminal.id", String(terminalId));
  }
};

/** Request interceptor:
 * - Adds X-User-Id (required by BE) if present in localStorage
 * - Adds X-Terminal-Id (optional) if present in localStorage
 * - Adds Authorization for non-auth endpoints
 * - Never hardcodes values
 */
client.interceptors.request.use((config) => {
  const abs = new URL(
    (config.url || ""),
    (config.baseURL || baseURL || (typeof window !== "undefined" ? window.location.origin : "http://localhost"))
  );
  const path = abs.pathname;

  const isPublicAuth =
    path.startsWith(endpoints.auth.login) || path.startsWith(endpoints.auth.register);

  if (!config.headers) config.headers = new AxiosHeaders() as any;

  // Attach required headers only if we actually have values stored
  const userId = (typeof window !== "undefined" && window.localStorage.getItem("x.user.id")) || undefined;
  const terminalId = (typeof window !== "undefined" && window.localStorage.getItem("x.terminal.id")) || undefined;

  if (userId && userId !== "undefined" && userId !== "null") {
    if (typeof (config.headers as any).set === "function") {
      (config.headers as any).set("X-User-Id", userId);
    } else {
      (config.headers as RawAxiosRequestHeaders)["X-User-Id"] = userId;
    }
  } else if (!isPublicAuth) {
    // Non-auth routes require X-User-Id. If missing, warn (helps during integration).
    // The backend will still 400 this request; this warns devs in the console.
    // eslint-disable-next-line no-console
    console.warn("[API] Missing X-User-Id for non-auth route:", path);
  }

  if (terminalId && terminalId !== "undefined" && terminalId !== "null") {
    if (typeof (config.headers as any).set === "function") {
      (config.headers as any).set("X-Terminal-Id", terminalId);
    } else {
      (config.headers as RawAxiosRequestHeaders)["X-Terminal-Id"] = terminalId;
    }
  }

  // Authorization header only for non-public endpoints
  if (!isPublicAuth) {
    let token = localStorage.getItem("auth.token");
    if (!token) {
      try {
        token = JSON.parse(localStorage.getItem("ipachi_user") || "{}").token;
      } catch {
        /* noop */
      }
    }
    if (token && token !== "null" && token !== "undefined") {
      if (typeof (config.headers as any).set === "function") {
        (config.headers as any).set("Authorization", `Bearer ${token}`);
      } else {
        (config.headers as RawAxiosRequestHeaders).Authorization = `Bearer ${token}`;
      }
    }
  } else {
    // Make sure we don't leak a stale Authorization on public auth routes
    if (typeof (config.headers as any).delete === "function") {
      (config.headers as any).delete("Authorization");
    } else {
      delete (config.headers as RawAxiosRequestHeaders).Authorization;
    }
  }

  return config;
});

// Optional: show 400 details to speed up debugging
client.interceptors.response.use(
  (resp) => resp,
  (err) => {
    if (err?.response?.status === 400) {
      // eslint-disable-next-line no-console
      console.error("[API 400]", {
        url: err.config?.url,
        method: err.config?.method,
        data: err.config?.data,
        serverMessage: err.response?.data,
      });
    }
    return Promise.reject(err);
  }
);

export const api = client;
export default client;
