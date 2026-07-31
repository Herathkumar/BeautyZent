import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { UserRole } from "@zentralab/shared";
import {
  api,
  clearSession,
  getStoredUser,
  getToken,
  setSession,
} from "./api";

export type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  storeId: string;
};

type AuthCtx = {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api<{ user: AdminUser }>("/api/auth/me");
      setUser(data.user);
      await setSession(token, data.user);
    } catch {
      await clearSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const stored = await getStoredUser<AdminUser>();
      if (stored) setUser(stored);
      await refresh();
    })();
  }, [refresh]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const data = await api<{ token: string; user: AdminUser }>(
          "/api/auth/login",
          {
            method: "POST",
            body: JSON.stringify({ email, password }),
          }
        );
        await setSession(data.token, data.user);
        setUser(data.user);
      },
      logout: async () => {
        try {
          await api("/api/auth/logout", { method: "POST" });
        } catch {
          /* ignore */
        }
        await clearSession();
        setUser(null);
      },
      refresh,
    }),
    [user, loading, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
