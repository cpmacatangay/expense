import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/data/supabase/client";
import { AuthContext, type AuthContextValue } from "./authContext";
import type { Session } from "@supabase/supabase-js";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastUserId = useRef<string | null>(null);

  const clearLocalAccountState = useCallback(async () => {
    queryClient.clear();
    try {
      localStorage.removeItem("salo-query-cache");
      for (let index = localStorage.length - 1; index >= 0; index -= 1) {
        const key = localStorage.key(index);
        if (key?.startsWith("salo.selected-group.")) localStorage.removeItem(key);
      }
    } catch {
      // A blocked storage should not stop sign-out.
    }
  }, [queryClient]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      lastUserId.current = data.session?.user.id ?? null;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      const nextUserId = next?.user.id ?? null;
      const changedUser = lastUserId.current !== nextUserId;
      lastUserId.current = nextUserId;

      if (event === "SIGNED_OUT" || changedUser) {
        void clearLocalAccountState();
      }

      setSession(next);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [clearLocalAccountState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      configured: Boolean(supabase),
      signInWithGoogle: async () => {
        if (!supabase) throw new Error("Supabase is not configured");
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}${window.location.pathname}${window.location.search}`
          }
        });
        if (error) throw error;
      },
      signOut: async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        await clearLocalAccountState();
      }
    }),
    [session, loading, clearLocalAccountState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
