import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api, setAuthToken, setUserId, setTerminalId } from "../api/client";
import { endpoints } from "../api/endpoints";

export interface User {
  username: string;
  roles?: string[];
  token?: string;
}

type AuthResponse = {
  token: string;
  username?: string;
  role?: string;
};

// Shape of /api/auth/me (adjust to your backend if needed)
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

interface AuthContextType {
  /** raw login payload (username/token/roles) */
  user: User | null;

  /** numeric id + username from /api/auth/me (used for X-User-Id header) */
  currentUser: CurrentUser;

  /** currently selected terminal (used for X-Terminal-Id header); may be null */
  terminalId: string | number | null;

  /** set or clear terminal; persists to localStorage for headers */
  setTerminal: (id: string | number | null) => void;

  /** login and hydrate token + currentUser */
  login: (u: string, p: string) => Promise<void>;

  /** logout and clear everything */
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser>({
    id: null,
    username: null,
    roles: [],
  });
  const [terminalId, _setTerminalId] = useState<string | number | null>(null);

  // Boot: hydrate user/token, currentUser.id (from localStorage), and terminalId
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
  }, []);

  const setTerminal = (id: string | number | null) => {
    if (id === null || id === undefined) {
      _setTerminalId(null);
      setTerminalId(null); // clears localStorage
    } else {
      _setTerminalId(id);
      setTerminalId(id); // persists for X-Terminal-Id header
    }
  };

  const login = async (username: string, password: string) => {
    // 1) Authenticate
    const { data } = await api.post<AuthResponse>(endpoints.auth.login, { username, password });

    const logged: User = {
      username: data.username ?? username,
      token: data.token,
      roles: data.role ? [data.role] : [],
    };

    // 2) Persist token and app-level user
    setUser(logged);
    localStorage.setItem("ipachi_user", JSON.stringify(logged));
    setAuthToken(logged.token ?? null);

    // 3) Fetch backend identity (numeric id) for headers (no hardcoding)
    const me = await api.get<MeResponse>(endpoints.auth.me);
    const id = me?.data?.id ?? null;
    const name = me?.data?.username ?? logged.username ?? null;

    setCurrentUser({ id, username: name, roles: me?.data?.roles ?? logged.roles ?? [] });

    // Store for interceptor -> X-User-Id
    setUserId(id);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("ipachi_user");
    setAuthToken(null);

    // Clear X-User-Id and X-Terminal-Id for clean slate
    setUserId(null);
    setTerminal(null);

    setCurrentUser({ id: null, username: null, roles: [] });
  };

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      currentUser,
      terminalId,
      setTerminal,
      login,
      logout,
    }),
    [user, currentUser, terminalId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
