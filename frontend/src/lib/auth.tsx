"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { api, tokens } from "@/lib/api";

export type User = {
  id: number;
  email: string;
  two_factor_enabled: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, otp?: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!tokens.access) {
      setUser(null);
      return;
    }
    try {
      setUser(await api<User>("/auth/me/"));
    } catch {
      tokens.clear();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const init = async () => {
      await refreshUser();
      if (active) setLoading(false);
    };
    init();
    return () => {
      active = false;
    };
  }, [refreshUser]);

  const login = useCallback(
    async (email: string, password: string, otp?: string) => {
      const data = await api<{ access: string; refresh: string }>(
        "/auth/token/",
        {
          method: "POST",
          auth: false,
          body: JSON.stringify({ email, password, otp: otp ?? "" }),
        },
      );
      tokens.set(data.access, data.refresh);
      await refreshUser();
    },
    [refreshUser],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      await api("/auth/register/", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email, password }),
      });
      await login(email, password);
    },
    [login],
  );

  const logout = useCallback(() => {
    tokens.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
