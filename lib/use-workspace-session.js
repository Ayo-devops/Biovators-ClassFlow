"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./supabase";

export function useWorkspaceSession() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [accessToken, setAccessToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const authenticate = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (!supabase) throw new Error("Workspace sign-in is not configured.");
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!data.session) {
        router.replace("/admin/login");
        return;
      }
      const response = await fetch("/api/workspace/me", {
        headers: { Authorization: `Bearer ${data.session.access_token}` },
        cache: "no-store",
      });
      const membership = await response.json();
      if (!response.ok) throw new Error(membership.error || "Workspace access could not be verified.");
      setUser(data.session.user);
      setAccessToken(data.session.access_token);
      setRole(membership.role);
    } catch (sessionError) {
      setError(sessionError.message);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Synchronize with the external Supabase session after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    authenticate();
  }, [authenticate]);

  async function signOut() {
    if (!supabase) return;
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setError(signOutError.message);
      return;
    }
    router.replace("/admin/login");
  }

  return {
    user,
    role,
    accessToken,
    loading,
    error,
    setError,
    retry: authenticate,
    signOut,
    isAdmin: ["super_admin", "admin"].includes(role),
    isSuperAdmin: role === "super_admin",
  };
}
