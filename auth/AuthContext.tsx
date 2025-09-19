// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../api/client';
import { endpoints, AuthResponse } from '../api/endpoints';

export interface User {
  id?: number;             // Made optional since API might not return it
  username: string;
  roles?: string[];
  token?: string;
}

// Extend AuthResponse to include optional id
interface ExtendedAuthResponse extends AuthResponse {
  id?: number;  // Make id optional
}

interface AuthContextType {
  user: User | null;
  currentUser: User | null; // Alias for backward compatibility
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  terminalId?: string;      // Terminal ID
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [terminalId, setTerminalId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const raw = localStorage.getItem('ipachi_user');
    if (raw) {
      try {
        const parsed: User = JSON.parse(raw);
        setUser(parsed);
        setAuthToken(parsed.token || null);

        // Try to get terminal ID from localStorage
        const savedTerminal = localStorage.getItem('terminal_id');
        if (savedTerminal) {
          setTerminalId(savedTerminal);
        } else {
          // Default terminal
          setTerminalId("TERMINAL_001");
          localStorage.setItem('terminal_id', 'TERMINAL_001');
        }
      } catch (error) {
        console.error("Failed to parse stored user data:", error);
        localStorage.removeItem('ipachi_user');
      }
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const { data }: { data: ExtendedAuthResponse } = await api.post(endpoints.auth.login, { username, password });

      const logged: User = {
        id: data.id || 1,  // Use 1 as fallback if id is not provided by API
        username: data.username ?? username,
        token: data.token,
        roles: data.role ? [data.role] : [],
      };

      setUser(logged);
      localStorage.setItem("ipachi_user", JSON.stringify(logged));
      setAuthToken(logged.token ?? null);

      // Set default terminal if not already set
      if (!terminalId) {
        setTerminalId("TERMINAL_001");
        localStorage.setItem('terminal_id', 'TERMINAL_001');
      }

      console.log("✅ Login successful:", logged.username);

    } catch (error: any) {
      console.error("❌ Login failed:", error);
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error || "Login failed";
      throw new Error(errorMsg);
    }
  };

  const logout = () => {
    setUser(null);
    setTerminalId(undefined);
    localStorage.removeItem('ipachi_user');
    localStorage.removeItem('terminal_id');
    setAuthToken(null);
    console.log("👋 Logged out");
  };

  const value = useMemo(() => ({
    user,
    currentUser: user,  // Alias for backward compatibility
    terminalId,
    login,
    logout
  }), [user, terminalId]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};