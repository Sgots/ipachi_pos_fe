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

// allow custom actions too
export type Action = "VIEW" | "CREATE" | "EDIT" | "DELETE" | (string & {});

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

    /** Hydration gates */
    permsHydrated: boolean; // permissions fetched (or at least restored from cache)
    hydrated: boolean;      // full app boot ready (waits on permsHydrated)
    refreshPermissions: () => Promise<void>; // Add this
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** ===== Helpers ===== */
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

const readJson = <T,>(k: string): T | null => {
    try {
        const v = localStorage.getItem(k);
        return v ? (JSON.parse(v) as T) : null;
    } catch {
        return null;
    }
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
    /** ===== Lazy init so first render after refresh already has user/token/ids ===== */
    const initialUser = (() => {
        // Prefer full object
        const saved = readJson<User>("ipachi_user");
        const tokenFromSaved = saved?.token;

        // Fallback: raw token (in case ipachi_user was not written)
        const tokenFromAuth = localStorage.getItem("auth.token") || undefined;

        const token = tokenFromSaved || tokenFromAuth;

        if (token) setAuthToken(token); // primes axios + stores auth.token if needed

        // If we only have a token, still return a minimal user so ProtectedRoute stays logged in
        return saved ?? (token ? { username: null as any, token } : null);
    })();


    const [user, setUser] = useState<User | null>(initialUser);
    const [currentUser, setCurrentUser] = useState<CurrentUser>(() => {
        const idStr = localStorage.getItem("x.user.id");
        const id = idStr && idStr !== "null" && idStr !== "undefined" ? Number(idStr) : null;
        const cachedRoles = readJson<string[]>("auth.roles") || readJson<User>("ipachi_user")?.roles || [];
        const username = readJson<User>("ipachi_user")?.username ?? null;
        return { id, username, roles: cachedRoles || [] };
    });

    const [terminalId, _setTerminalId] = useState<string | number | null>(() => {
        const v = localStorage.getItem("x.terminal.id");
        return v && v !== "null" && v !== "undefined" ? (/^\d+$/.test(v) ? Number(v) : v) : null;
    });
    const [businessId, _setBusinessId] = useState<string | number | null>(() => {
        const v = localStorage.getItem("x.business.id");
        return v && v !== "null" && v !== "undefined" ? (/^\d+$/.test(v) ? Number(v) : v) : null;
    });

    /** hydration flags */
    const [permsHydrated, setPermsHydrated] = useState<boolean>(() => {
        // if we have cached permissions, we’re effectively hydrated enough for initial render
        const cached = readJson<string[]>("auth.permissions");
        return Array.isArray(cached) && cached.length > 0;
    });
    const [hydrated, setHydrated] = useState(false);

    /** Business meta (name + logo) */
    const [businessName, setBusinessName] = useState<string | null>(() => {
        const v = localStorage.getItem("x.business.name");
        return v && v !== "undefined" ? v : null;
    });
    const [businessLogoUrl, setBusinessLogoUrl] = useState<string | null>(() => {
        const v = localStorage.getItem("x.business.logoUrl");
        return v && v !== "undefined" ? v : null;
    });
    const [businessLogoBlobUrl, setBusinessLogoBlobUrl] = useState<string | null>(null);
    const blobRef = useRef<string | null>(null);

    const [permissions, setPermissions] = useState<Set<string>>(() => {
        const cached = readJson<string[]>("auth.permissions");
        return cached && Array.isArray(cached) ? new Set(cached.map(norm)) : new Set();
    });

    /** ----- Finish async hydration: fetch /me (roles) and /me/permissions, then flip flags ----- */
    useEffect(() => {
        const haveToken = !!(localStorage.getItem("auth.token") || readJson<User>("ipachi_user")?.token);

        (async () => {
            try {
                if (haveToken) {
                    // Always try to get fresh roles (keeps role-implied perms trustworthy)
                    const me = await api.get<MeResponse>(endpoints.auth.me);
                    const id = me?.data?.id ?? currentUser.id ?? null;
                    const roles = me?.data?.roles ?? currentUser.roles ?? [];
                    const username = me?.data?.username ?? currentUser.username ?? null;
                    setCurrentUser({ id, username, roles });
                    localStorage.setItem("x.user.id", id != null ? String(id) : "");
                    localStorage.setItem("auth.roles", JSON.stringify(roles || []));

                    // Fetch latest permissions
                    await refreshPermissions();
                    setPermsHydrated(true);
                } else {
                    // No token → treat as hydrated but with empty permissions
                    setPermsHydrated(true);
                }
            } catch {
                // If calls fail, retain cached roles/permissions and still hydrate so app renders
                setPermsHydrated(true);
            } finally {
                setHydrated(true);
            }
        })();

        return () => {
            if (blobRef.current) {
                URL.revokeObjectURL(blobRef.current);
                blobRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** ----- Setters that also persist to LS via api/client helpers ----- */
    const setTerminal = (id: string | number | null) => {
        if (id == null || `${id}`.trim() === "") {
            _setTerminalId(null);
            setTerminalId(null);
        } else {
            _setTerminalId(id);
            setTerminalId(id);
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
    const prefetchBusinessLogoBlob = async (serverLogoPath: string | null | undefined) => {
        if (!serverLogoPath || !serverLogoPath.trim()) {
            if (blobRef.current) {
                URL.revokeObjectURL(blobRef.current);
                blobRef.current = null;
            }
            setBusinessLogoBlobUrl(null);
            return;
        }
        try {
            const base = (api as any).defaults?.baseURL || "";
            const absolute =
                /^https?:\/\//i.test(serverLogoPath)
                    ? serverLogoPath
                    : `${base?.replace(/\/$/, "")}${serverLogoPath}`;

            const u = new URL(absolute, window.location.origin);
            u.searchParams.set("_", Date.now().toString());

            const resp = await fetch(u.toString(), { method: "GET", cache: "no-store" });
            if (!resp.ok) throw new Error(`logo ${resp.status}`);
            const blob = await resp.blob();
            const blobURL = URL.createObjectURL(blob);

            if (blobRef.current) URL.revokeObjectURL(blobRef.current);
            blobRef.current = blobURL;
            setBusinessLogoBlobUrl(blobURL);
        } catch {
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

                if (d.businessId != null) setBusiness(d.businessId);

                await prefetchBusinessLogoBlob(d.logoUrl || null);
            }
        } catch {
            // non-fatal
        }
    };

    /** ----- Permissions fetch ----- */
    const refreshPermissions = async () => {
        const { data } = await api.get<string[]>("/api/me/permissions");
        const raw = Array.isArray(data) ? data : [];
        const set = new Set<string>(raw.map((s) => norm(String(s))));
        setPermissions(set);
        localStorage.setItem("auth.permissions", JSON.stringify(Array.from(set)));
    };

    /** ----- can(resource, action) ----- */
    const can = (resource: string, action: Action | string): boolean => {
        const R = norm(resource);
        const A = norm(String(action));
        const roleSet = new Set<string>((currentUser.roles || []).map(norm));

        // roles are now available on boot; these shortcuts prevent "no access" flicker
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
                    if (norm(String(act)) === A) return true;
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

        // 2) Persist and prime axios
        setUser(logged);
        localStorage.setItem("ipachi_user", JSON.stringify(logged));   // <-- restore this
        setAuthToken(logged.token ?? null)
        setAuthToken(logged.token ?? null);

        // 3) Me: numeric user id + roles
        const me = await api.get<MeResponse>(endpoints.auth.me);
        const id = me?.data?.id ?? null;
        const name = me?.data?.username ?? logged.username ?? null;
        const roles = me?.data?.roles ?? logged.roles ?? [];
        setCurrentUser({ id, username: name, roles });
        setUserId(id);
        localStorage.setItem("auth.roles", JSON.stringify(roles || []));

        // 4) Business + Terminal from login response
        const bid = data.businessProfileId ?? null;
        setBusiness(bid ?? null);

        const tid = data.terminalId ?? null;
        setTerminal(tid ?? null);

        // 5) Business profile & logo
        await fetchAndCacheBusinessProfile(id);

        // 6) Permissions
        await refreshPermissions();
        setPermsHydrated(true);
        setHydrated(true);
    };

    /** ----- Logout ----- */
    /** ----- Logout ----- */
    const logout = () => {
        // Clear in-memory user
        setUser(null);
        setCurrentUser({ id: null, username: null, roles: [] });

        // Clear LS artifacts
        localStorage.removeItem("ipachi_user");       // <-- important
        localStorage.removeItem("auth.roles");
        localStorage.removeItem("auth.permissions");
        localStorage.removeItem("x.business.name");
        localStorage.removeItem("x.business.logoUrl");

        // Clear token + axios default
        setAuthToken(null);

        // Clear header helpers
        setUserId(null);
        setTerminal(null);
        setBusiness(null);

        // Clear business UI bits
        setBusinessName(null);
        setBusinessLogoUrl(null);
        if (blobRef.current) {
            URL.revokeObjectURL(blobRef.current);
            blobRef.current = null;
        }
        setBusinessLogoBlobUrl(null);

        // Clear permissions in memory
        setPermissions(new Set());

        // Unblock any "waiting" gates so app can render the redirect immediately
        // (ProtectedRoute already checks token first and will redirect)
        // If you store these flags with useState in this scope, you can safely set them:
        // setPermsHydrated(true);
        // setHydrated(true);

        // Hard redirect avoids any routing timing issues/white screens
        window.location.replace("/login");
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
            permsHydrated,
            hydrated,
            refreshPermissions, // Add this
        }),
        [
            user,
            currentUser,
            terminalId,
            businessId,
            businessName,
            businessLogoUrl,
            businessLogoBlobUrl,
            permissions,
            permsHydrated,
            hydrated,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
