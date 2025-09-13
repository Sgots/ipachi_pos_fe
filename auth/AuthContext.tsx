// src/auth/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '../api/client';
import { endpoints, AuthResponse } from '../api/endpoints';

export interface User { username: string; roles?: string[]; token?: string; }
interface AuthContextType { user: User | null; login: (u: string,p: string)=>Promise<void>; logout: ()=>void; }

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('ipachi_user');
    if (raw) {
      const parsed: User = JSON.parse(raw);
      setUser(parsed);
      setAuthToken(parsed.token || null);       // ← puts token into localStorage['auth.token']
    }
  }, []);

 const login = async (username: string, password: string) => {
   const { data } = await api.post<AuthResponse>(endpoints.auth.login, { username, password });

   const logged: User = {
     username: data.username ?? username,        // ← ensure string
     token: data.token,                          // (assumed string from API)
     roles: data.role ? [data.role] : [],
   };

   setUser(logged);
   localStorage.setItem("ipachi_user", JSON.stringify(logged));
   setAuthToken(logged.token ?? null);           // still OK if your helper accepts string | null
 };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ipachi_user');
    setAuthToken(null);
  };

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
