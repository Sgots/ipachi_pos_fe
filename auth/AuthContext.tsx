// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { api, setAuthToken, setUserId, setTerminalId, setBusinessId } from "../api/client";
import { endpoints } from "../api/endpoints";

/** ===== Types ===== */
export interface User {
  username: string;
  roles?: string[];
  token?: string;
}

type AuthResponse = {
  token: string;
  username?: string;
  role?: string;
  /** from backend login response */
  businessProfileId?: number | string | null;
  /** from backend login response */
  terminalId?: number | string | null;
};

type MeResponse = {
  id: number;
  username: string;
  roles?: string[];
};

type CurrentUser = {
  id: number | null;
  username: string | null;
  roles?: string[];
};

type Action = "VIEW" | "CREATE" | "EDIT" | "DELETE";

/** Business profile coming from /api/users/{id}/business-profile */
type BusinessProfileDTO = {
  id: number;
  businessId: number;
  name: string;
  location?: string | null;
  logoUrl?: string | null;   // e.g. /api/business-profile/logo/file/<assetId>
  userId: number;
};

interface AuthContextType {
  user: User | null;
  currentUser: CurrentUser;
  terminalId: string | number | null;
  businessId: string | number | null;

  /** Business meta for UI */
  businessName: string | null;
  businessLogoUrl: string | null;      // server path (as returned)
  businessLogoBlobUrl: string | null;  // prefetched blob URL for <img src=...>

  permissions: Set<string>;
  can: (resource: string, action: Action) => boolean;
  setTerminal: (id: string | number | null) => void;
  setBusiness: (id: string | number | null) => void;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Normalizers for permission checks */
const norm = (s: string) => String(s || "").trim().replace(/[\s\-\.]+/g, "_").toUpperCase();

const authorityVariants = (resource: string, action: Action) => {
  const r = norm(resource);
  const a = norm(action);
  return new Set<string>([
    `${r}:${a}`,
    `${r}_${a}`,
    `PERM_${r}:${a}`,
    `PERM_${r}_${a}`,
    `${r}:${a}:ALLOW`,
    `PERMISSION_${r}:${a}`,
  ]);
};

const roleImpliedPerms: Record<string, Array<[string, Action]>> = {
  ROLE_ADMIN: [["*", "VIEW"], ["*", "CREATE"], ["*", "EDIT"], ["*", "DELETE"]],
  ADMIN: [["*", "VIEW"], ["*", "CREATE"], ["*", "EDIT"], ["*", "DELETE"]],
  ROLE_MANAGER: [["CASH_TILL", "VIEW"], ["CASH_TILL", "CREATE"], ["CASH_TILL", "EDIT"]],
  ROLE_CASHIER: [["CASH_TILL", "VIEW"], ["CASH_TILL", "CREATE"], ["CASH_TILL", "EDIT"]],
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>({ id: null, username: null, roles: [] });
  const [terminalId, _setTerminalId] = useState<string | number | null>(null);
  const [businessId, _setBusinessId] = useState<string | number | null>(null);

  /** Business meta (name + logo) */
  const [businessName, setBusinessName] = useState<string | null>(null);
  const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(null);
  const [businessLogoBlobUrl, setBusinessLogoBlobUrl] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null); // track for revocation

  const [permissions, setPermissions] = useState<Set<string>>(new Set());

  /** ----- Boot hydrate ----- */
  useEffect(() => {
    const raw = localStorage.getItem("ipachi_user");
    if (raw) {
      const parsed: User = JSON.parse(raw);
      setUser(parsed);
      setAuthToken(parsed.token || null);
    }

    const storedUserId = localStorage.getItem("x.user.id");
    if (storedUserId && storedUserId !== "null" && storedUserId !== "undefined") {
      setCurrentUser((prev) => ({ ...prev, id: Number(storedUserId) }));
    }

    const storedTerminal = localStorage.getItem("x.terminal.id");
    if (storedTerminal && storedTerminal !== "null" && storedTerminal !== "undefined") {
      _setTerminalId(/^\d+$/.test(storedTerminal) ? Number(storedTerminal) : storedTerminal);
    }

    const storedBusiness = localStorage.getItem("x.business.id");
    if (storedBusiness && storedBusiness !== "null" && storedBusiness !== "undefined") {
      _setBusinessId(/^\d+$/.test(storedBusiness) ? Number(storedBusiness) : storedBusiness);
    }

    // hydrate business name + logo (server path). We DON'T persist blob URL (not stable across boots).
    const cachedBizName = localStorage.getItem("x.business.name");
    const cachedBizLogo = localStorage.getItem("x.business.logoUrl");
    setBusinessName(cachedBizName && cachedBizName !== "undefined" ? cachedBizName : null);
    setBusinessLogoUrl(cachedBizLogo && cachedBizLogo !== "undefined" ? cachedBizLogo : null);

    const cached = localStorage.getItem("auth.permissions");
    if (cached) {
      try {
        const arr = JSON.parse(cached) as string[];
        if (Array.isArray(arr)) setPermissions(new Set(arr));
      } catch { /* ignore */ }
    }

    // Silent refresh if we have token + user id
    const token =
      localStorage.getItem("auth.token") ||
      JSON.parse(localStorage.getItem("ipachi_user") || "{}")?.token;
    if (token && storedUserId) void refreshPermissions();

    // cleanup on unmount
    return () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
  }, []);

  /** ----- Setters that also persist to LS via api/client helpers ----- */
  const setTerminal = (id: string | number | null) => {
    if (id == null || `${id}`.trim() === "") {
      _setTerminalId(null);
      setTerminalId(null); // remove from LS
    } else {
      _setTerminalId(id);
      setTerminalId(id); // persist to LS
    }
  };

  const setBusiness = (id: string | number | null) => {
    if (id == null || `${id}`.trim() === "") {
      _setBusinessId(null);
      setBusinessId(null);
    } else {
      _setBusinessId(id);
      setBusinessId(id);
    }
  };

  /** Prefetch the business logo blob immediately (for Sidebar) */
  // ⬇️ replace the whole function with this version
  const prefetchBusinessLogoBlob = async (serverLogoPath: string | null | undefined) => {
    if (!serverLogoPath || !serverLogoPath.trim()) {
      // clear any existing blob
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setBusinessLogoBlobUrl(null);
      return;
    }
    try {
      // Make absolute with baseURL if needed (do NOT use axios; we want NO headers)
      const base = (api as any).defaults?.baseURL || "";
      const absolute =
        /^https?:\/\//i.test(serverLogoPath)
          ? serverLogoPath
          : `${base?.replace(/\/$/, "")}${serverLogoPath}`;

      // cache-buster so a new upload shows immediately
      const u = new URL(absolute, window.location.origin);
      u.searchParams.set("_", Date.now().toString());

      // ⬇️ Important: use fetch() so axios interceptors don't add auth/tenant headers
      const resp = await fetch(u.toString(), { method: "GET", cache: "no-store" });
      if (!resp.ok) throw new Error(`logo ${resp.status}`);
      const blob = await resp.blob();
      const blobURL = URL.createObjectURL(blob);

      if (blobRef.current) URL.revokeObjectURL(blobRef.current);
      blobRef.current = blobURL;
      setBusinessLogoBlobUrl(blobURL);
    } catch {
      // fall back to null blob (component may try server path instead)
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
      setBusinessLogoBlobUrl(null);
    }
  };

  /** Fetch & cache business profile (name + logo) by userId, then fetch logo blob immediately */
  const fetchAndCacheBusinessProfile = async (userId: number | null) => {
    if (!userId) return;
    try {
      const { data } = await api.get<{ code: string; message: string; data: BusinessProfileDTO }>(
        `/api/users/${userId}/business-profile`
      );

      const d = data?.data;
      if (d) {
        setBusinessName(d.name || null);
        setBusinessLogoUrl(d.logoUrl || null);
        localStorage.setItem("x.business.name", d.name || "");
        localStorage.setItem("x.business.logoUrl", d.logoUrl || "");

        // ensure businessId aligns
        if (d.businessId != null) setBusiness(d.businessId);

        // >>> Immediately prefetch the logo blob for Sidebar <<<
        await prefetchBusinessLogoBlob(d.logoUrl || null);
      }
    } catch {
      // non-fatal
    }
  };

  /** ----- Permissions fetch ----- */
  const refreshPermissions = async () => {
    try {
      const { data } = await api.get<string[]>("/api/me/permissions");
      const raw = Array.isArray(data) ? data : [];
      const set = new Set<string>(raw.map((s) => norm(String(s))));
      setPermissions(set);
      localStorage.setItem("auth.permissions", JSON.stringify(Array.from(set)));
    } catch { /* non-fatal */ }
  };

  /** ----- can(resource, action) ----- */
  const can = (resource: string, action: Action): boolean => {
    const R = norm(resource);
    const A = norm(action);
    const roleSet = new Set<string>((currentUser.roles || []).map(norm));

    if (roleSet.has("ROLE_ADMIN") || roleSet.has("ADMIN")) return true;
    if (permissions.has("*") || permissions.has("ALL")) return true;

    for (const v of authorityVariants(R, A)) {
      if (permissions.has(norm(v))) return true;
    }

    for (const role of roleSet) {
      const implied = roleImpliedPerms[role];
      if (!implied) continue;
      for (const [res, act] of implied) {
        if (res === "*" || norm(res) === R) {
          if (norm(act) === A) return true;
        }
      }
    }
    return false;
  };

  /** ----- Login: store BUSINESS + TERMINAL IDs, then fetch business profile (and logo blob) ----- */
  const login = async (username: string, password: string) => {
    // 1) Authenticate
    const { data } = await api.post<AuthResponse>(endpoints.auth.login, { username, password });

    const logged: User = {
      username: data.username ?? username,
      token: data.token,
      roles: data.role ? [data.role] : [],
    };

    // 2) Persist token + FE user
    setUser(logged);
    localStorage.setItem("ipachi_user", JSON.stringify(logged));
    setAuthToken(logged.token ?? null);

    // 3) Me: numeric user id for headers + roles
    const me = await api.get<MeResponse>(endpoints.auth.me);
    const id = me?.data?.id ?? null;
    const name = me?.data?.username ?? logged.username ?? null;
    const roles = me?.data?.roles ?? logged.roles ?? [];
    setCurrentUser({ id, username: name, roles });

    // X-User-Id for all next requests
    setUserId(id);

    // 4) Business + Terminal from login response
    const bid = data.businessProfileId ?? null;
    setBusiness(bid ?? null);

    const tid = data.terminalId ?? null;
    setTerminal(tid ?? null);

    // 5) Fetch business profile (name + server-logo path), then immediately prefetch logo blob
    await fetchAndCacheBusinessProfile(id);

    // 6) Permissions (optional)
    await refreshPermissions();
  };

  /** ----- Logout ----- */
  const logout = () => {
    setUser(null);
    localStorage.removeItem("ipachi_user");
    setAuthToken(null);

    setUserId(null);
    setTerminal(null);
    setBusiness(null);

    setBusinessName(null);
    setBusinessLogoUrl(null);
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
    setBusinessLogoBlobUrl(null);
    localStorage.removeItem("x.business.name");
    localStorage.removeItem("x.business.logoUrl");

    setCurrentUser({ id: null, username: null, roles: [] });
    setPermissions(new Set());
    localStorage.removeItem("auth.permissions");
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      currentUser,
      terminalId,
      businessId,
      businessName,
      businessLogoUrl,
      businessLogoBlobUrl,
      permissions,
      can,
      setTerminal,
      setBusiness,
      login,
      logout,
    }),
    [user, currentUser, terminalId, businessId, businessName, businessLogoUrl, businessLogoBlobUrl, permissions]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
