/// <reference types="vite/client" />
import axios, { AxiosHeaders, RawAxiosRequestHeaders } from "axios";
import { endpoints } from "./endpoints";

// Resolve base URL
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

export const setBusinessId = (businessId: number | string | null | undefined) => {
  if (businessId === null || businessId === undefined || `${businessId}`.trim() === "") {
    localStorage.removeItem("x.business.id");
  } else {
    localStorage.setItem("x.business.id", String(businessId));
  }
};

// Small utility so we can read from multiple keys (new + legacy)
const getLS = (k: string) => (typeof window !== "undefined" ? window.localStorage.getItem(k) : null);
const firstNonEmpty = (...vals: (string | null | undefined)[]) =>
  vals.find(v => v != null && v !== "null" && v !== "undefined" && `${v}`.trim() !== "");

/** Request interceptor */
client.interceptors.request.use((config) => {
  const abs = new URL(
    (config.url || ""),
    (config.baseURL || baseURL || (typeof window !== "undefined" ? window.location.origin : "http://localhost"))
  );
  const path = abs.pathname;

  const isPublicAuth =
    path.startsWith(endpoints.auth.login) || path.startsWith(endpoints.auth.register);

  if (!config.headers) config.headers = new AxiosHeaders() as any;

  // Read headers (prefer new keys, fallback to legacy)
  const userId = getLS("x.user.id");
  const terminalId = firstNonEmpty(getLS("x.terminal.id"), getLS("activeTerminalId"));
  const businessId = firstNonEmpty(getLS("x.business.id"), getLS("activeBusinessId"));

  // X-User-Id
  if (userId && userId !== "undefined" && userId !== "null") {
    if (typeof (config.headers as any).set === "function") {
      (config.headers as any).set("X-User-Id", userId);
    } else {
      (config.headers as RawAxiosRequestHeaders)["X-User-Id"] = userId;
    }
  } else if (!isPublicAuth) {
    console.warn("[API] Missing X-User-Id for non-auth route:", path);
  }

  // X-Terminal-Id
  if (terminalId && terminalId !== "undefined" && terminalId !== "null") {
    if (typeof (config.headers as any).set === "function") {
      (config.headers as any).set("X-Terminal-Id", terminalId);
    } else {
      (config.headers as RawAxiosRequestHeaders)["X-Terminal-Id"] = terminalId;
    }
  }

  // X-Business-Id (also set X-Business-ID for servers that use that casing)
  if (businessId && businessId !== "undefined" && businessId !== "null") {
    if (typeof (config.headers as any).set === "function") {
      (config.headers as any).set("X-Business-Id", businessId);
      (config.headers as any).set("X-Business-ID", businessId); // compatibility
    } else {
      (config.headers as RawAxiosRequestHeaders)["X-Business-Id"] = businessId as string;
      (config.headers as RawAxiosRequestHeaders)["X-Business-ID"] = businessId as string; // compatibility
    }
  } else if (!isPublicAuth) {
    console.warn("[API] Missing X-Business-Id for non-auth route:", path);
  }

  // Authorization
  if (!isPublicAuth) {
    let token = localStorage.getItem("auth.token");
    if (!token) {
      try {
        token = JSON.parse(localStorage.getItem("ipachi_user") || "{}").token;
      } catch { /* noop */ }
    }
    if (token && token !== "null" && token !== "undefined") {
      if (typeof (config.headers as any).set === "function") {
        (config.headers as any).set("Authorization", `Bearer ${token}`);
      } else {
        (config.headers as RawAxiosRequestHeaders).Authorization = `Bearer ${token}`;
      }
    }
  } else {
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
