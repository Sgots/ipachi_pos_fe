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

client.interceptors.request.use((config) => {
  const abs = new URL((config.url || ""), (config.baseURL || baseURL || (typeof window !== "undefined" ? window.location.origin : "http://localhost")));
  const path = abs.pathname;

  const isPublicAuth =
    path.startsWith(endpoints.auth.login) || path.startsWith(endpoints.auth.register);

  if (!isPublicAuth) {
    let token = localStorage.getItem("auth.token");
    if (!token) {
      try { token = JSON.parse(localStorage.getItem("ipachi_user") || "{}").token; } catch {}
    }
    if (token && token !== "null" && token !== "undefined") {
      if (!config.headers) config.headers = new AxiosHeaders() as any;
      // Support both AxiosHeaders and raw headers
      if (typeof (config.headers as any).set === "function") {
        (config.headers as any).set("Authorization", `Bearer ${token}`);
      } else {
        (config.headers as RawAxiosRequestHeaders).Authorization = `Bearer ${token}`;
      }
    }
  } else if (config.headers) {
    if (typeof (config.headers as any).delete === "function") {
      (config.headers as any).delete("Authorization");
    } else {
      delete (config.headers as RawAxiosRequestHeaders).Authorization;
    }
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
