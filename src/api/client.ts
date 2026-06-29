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
const client = axios.create({
  baseURL,
  withCredentials: false,
});

/* ------------------------------------------------------------------ */
/* Local storage helpers                                               */
/* ------------------------------------------------------------------ */

const getLS = (key: string) =>
  typeof window !== "undefined" ? window.localStorage.getItem(key) : null;

const setLS = (key: string, value: string | null | undefined) => {
  if (typeof window === "undefined") return;

  if (
    value === null ||
    value === undefined ||
    value === "null" ||
    value === "undefined" ||
    String(value).trim() === ""
  ) {
    window.localStorage.removeItem(key);
  } else {
    window.localStorage.setItem(key, String(value));
  }
};

const firstNonEmpty = (...values: (string | null | undefined)[]) =>
  values.find(
    (value) =>
      value !== null &&
      value !== undefined &&
      value !== "null" &&
      value !== "undefined" &&
      String(value).trim() !== ""
  );

/* ------------------------------------------------------------------ */
/* Header helpers                                                      */
/* ------------------------------------------------------------------ */

const ensureHeaders = (config: any) => {
  if (!config.headers) {
    config.headers = new AxiosHeaders();
  }

  return config.headers;
};

const getHeader = (headers: any, name: string): string | undefined => {
  if (!headers) return undefined;

  if (typeof headers.get === "function") {
    const value = headers.get(name);
    return value !== null && value !== undefined ? String(value) : undefined;
  }

  const foundKey = Object.keys(headers).find((key) => key.toLowerCase() === name.toLowerCase());

  if (!foundKey) return undefined;

  const value = headers[foundKey];

  return value !== null && value !== undefined ? String(value) : undefined;
};

const setHeader = (headers: any, name: string, value: string) => {
  if (typeof headers.set === "function") {
    headers.set(name, value);
  } else {
    (headers as RawAxiosRequestHeaders)[name] = value;
  }
};

const deleteHeader = (headers: any, name: string) => {
  if (!headers) return;

  if (typeof headers.delete === "function") {
    headers.delete(name);
    return;
  }

  Object.keys(headers).forEach((key) => {
    if (key.toLowerCase() === name.toLowerCase()) {
      delete headers[key];
    }
  });
};

/* ------------------------------------------------------------------ */
/* Public setters                                                      */
/* ------------------------------------------------------------------ */

export const setAuthToken = (token: string | null) => {
  if (token && token !== "null" && token !== "undefined") {
    localStorage.setItem("auth.token", token);
    client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    localStorage.removeItem("auth.token");
    delete client.defaults.headers.common["Authorization"];
  }
};

export const setUserId = (userId: number | string | null | undefined) => {
  setLS("x.user.id", userId == null ? null : String(userId));
};

export const setTerminalId = (terminalId: number | string | null | undefined) => {
  setLS("x.terminal.id", terminalId == null ? null : String(terminalId));
};

/**
 * Logged-in SME/business context.
 *
 * This is the default business used across the app when an SME is logged in.
 * Do NOT use this for selected SME reporting from the directory.
 */
export const setBusinessId = (businessId: number | string | null | undefined) => {
  const cleanValue = businessId == null ? null : String(businessId);

  setLS("x.business.id", cleanValue);

  // Keep separate own-business key for Account and SME logged-in flows.
  setLS("x.own.business.id", cleanValue);
};

/**
 * Selected SME report context.
 *
 * Use this only when an Intelligence/Monitor/Discover user selects an SME
 * from the SME directory and opens its reports.
 */
export const setReportBusinessId = (
  businessId: number | string | null | undefined,
  businessName?: string | null
) => {
  const cleanValue = businessId == null ? null : String(businessId);

  setLS("x.report.business.id", cleanValue);

  if (businessName !== undefined) {
    setLS("x.report.business.name", businessName);
  }
};

export const clearReportBusinessId = () => {
  setLS("x.report.business.id", null);
  setLS("x.report.business.name", null);
};

/* ------------------------------------------------------------------ */
/* Prime token on module load                                          */
/* ------------------------------------------------------------------ */

(() => {
  try {
    const token =
      getLS("auth.token") ||
      (() => {
        try {
          return JSON.parse(getLS("ipachi_user") || "{}")?.token;
        } catch {
          return null;
        }
      })();

    if (token && token !== "null" && token !== "undefined") {
      client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
})();

/* ------------------------------------------------------------------ */
/* Request interceptor                                                 */
/* ------------------------------------------------------------------ */

client.interceptors.request.use((config) => {
  const abs = new URL(
    config.url || "",
    config.baseURL || baseURL || (typeof window !== "undefined" ? window.location.origin : "http://localhost")
  );

  const path = abs.pathname;

  const isPublicAuth =
    path.startsWith(endpoints.auth.login) ||
    path.startsWith(endpoints.auth.register) ||
    path.startsWith("/api/auth/forgot");

  const headers = ensureHeaders(config);

  const userId = getLS("x.user.id");
  const terminalId = firstNonEmpty(getLS("x.terminal.id"), getLS("activeTerminalId"));

  /*
    Important business-ID rule:

    1. If a request already has X-Business-Id, keep it.
       This protects Reports.tsx when viewing a selected SME.

    2. If no explicit business header is passed, use the logged-in SME/default business.
       This protects normal SME logged-in behaviour.
  */
  const explicitBusinessId = firstNonEmpty(
    getHeader(headers, "X-Business-Id"),
    getHeader(headers, "X-Business-ID")
  );

  const defaultBusinessId = firstNonEmpty(
    getLS("x.own.business.id"),
    getLS("x.business.id"),
    getLS("activeBusinessId")
  );

  const finalBusinessId = explicitBusinessId || defaultBusinessId;

  // X-User-Id
  if (userId && userId !== "undefined" && userId !== "null") {
    setHeader(headers, "X-User-Id", userId);
  } else if (!isPublicAuth) {
    console.warn("[API] Missing X-User-Id for non-auth route:", path);
  }

  // X-Terminal-Id
  if (terminalId && terminalId !== "undefined" && terminalId !== "null") {
    setHeader(headers, "X-Terminal-Id", terminalId);
  }

  // X-Business-Id
  if (finalBusinessId && finalBusinessId !== "undefined" && finalBusinessId !== "null") {
    setHeader(headers, "X-Business-Id", finalBusinessId);
    setHeader(headers, "X-Business-ID", finalBusinessId);
  } else if (!isPublicAuth) {
    console.warn("[API] Missing X-Business-Id for non-auth route:", path);
  }

  // Authorization
  if (!isPublicAuth) {
    let token = getLS("auth.token");

    if (!token) {
      try {
        token = JSON.parse(getLS("ipachi_user") || "{}")?.token;
      } catch {
        // noop
      }
    }

    if (token && token !== "null" && token !== "undefined") {
      setHeader(headers, "Authorization", `Bearer ${token}`);
    }
  } else {
    deleteHeader(headers, "Authorization");
  }

  return config;
});

/* ------------------------------------------------------------------ */
/* Response interceptor                                                */
/* ------------------------------------------------------------------ */

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 400) {
      console.error("[API 400]", {
        url: error.config?.url,
        method: error.config?.method,
        data: error.config?.data,
        serverMessage: error.response?.data,
      });
    }

    return Promise.reject(error);
  }
);

export const api = client;
export default client;