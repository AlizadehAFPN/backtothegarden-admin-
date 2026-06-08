"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { onSessionExpired } from "./sessionExpiry";

interface AuthContextType {
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isLoading: boolean;
  sessionExpired: boolean;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  login: async () => false,
  logout: async () => {},
  isLoading: true,
  sessionExpired: false,
});

const AUTH_KEY = "btg-admin-auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);

  // On load, trust localStorage for instant UI, but verify the real session
  // cookie with the server so the UI and the cookie can never silently drift.
  useEffect(() => {
    const saved = localStorage.getItem(AUTH_KEY) === "true";
    if (!saved) {
      setIsLoading(false);
      return;
    }
    setIsAuthenticated(true);
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d: { valid?: boolean }) => {
        if (!d.valid) setSessionExpired(true);
      })
      .catch(() => {
        /* transient network error — keep the optimistic session */
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Any 401 from data fetches or uploads means the session lapsed mid-use.
  useEffect(() => {
    return onSessionExpired(() => {
      if (localStorage.getItem(AUTH_KEY) === "true") setSessionExpired(true);
    });
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAuthenticated(true);
        setSessionExpired(false);
        localStorage.setItem(AUTH_KEY, "true");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
    } catch {
      /* clear locally even if the network call fails */
    }
    localStorage.removeItem(AUTH_KEY);
    setIsAuthenticated(false);
    setSessionExpired(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, isLoading, sessionExpired }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
