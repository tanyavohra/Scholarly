import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { api } from "@/lib/api.js";

const AuthContext = createContext(null);

function normalizeUserInfo(payload) {
  if (!payload) return null;
  if (payload?.Message && typeof payload.Message === "string") return null;
  if (Array.isArray(payload) && payload.length > 0) {
    const u = payload[0];
    if (!u || typeof u !== "object") return null;
    return { id: u.id, name: u.name, email: u.email };
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const data = await api.get("/userInfo");
    setUser(normalizeUserInfo(data));
  };

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      refresh,
      async login({ email, password }) {
        const res = await api.post("/login", { email, password });
        if (res?.Status !== "Success") {
          const message = res?.Message || res?.error || (typeof res === "string" ? res : "") || "Invalid credentials";
          throw new Error(String(message));
        }
        await refresh();
      },
      async signup({ name, email, password }) {
        const res = await api.post("/signup", { name, email, password });
        if (res?.Status !== "Success") {
          const message =
            res?.Message || res?.error || (typeof res === "string" ? res : "") || "Unable to create account";
          throw new Error(String(message));
        }
        const loginRes = await api.post("/login", { email, password });
        if (loginRes?.Status !== "Success") {
          const message =
            loginRes?.Message ||
            loginRes?.error ||
            (typeof loginRes === "string" ? loginRes : "") ||
            "Unable to sign in";
          throw new Error(String(message));
        }
        await refresh();
      },
      async logout() {
        try {
          await api.get("/logout");
        } finally {
          setUser(null);
        }
      },
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;
  if (!user) return <Navigate to="/" replace state={{ from: location }} />;
  return children;
}
