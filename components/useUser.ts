"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicUser } from "@/lib/users";

/** Current viewer session state, kept fresh via the `wd-auth-changed` event. */
export function useUser() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user as PublicUser);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Inline fetch (same pattern as ContinueWatching) — setState happens
    // inside the promise callbacks.
    const load = () => {
      fetch("/api/auth/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          setUser(data ? (data.user as PublicUser) : null);
          setLoading(false);
        })
        .catch(() => {
          setUser(null);
          setLoading(false);
        });
    };
    load();
    window.addEventListener("wd-auth-changed", load);
    return () => window.removeEventListener("wd-auth-changed", load);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setUser(null);
    window.dispatchEvent(new Event("wd-auth-changed"));
  }, []);

  return { user, loading, refresh, logout };
}
