import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/data/supabase/client";
import { queryStorage } from "@/data/cache/queryStorage";
import { AuthContext, type AuthContextValue } from "./authContext";
import type { Session } from "@supabase/supabase-js";

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_OUT") {
        queryClient.clear();
        void queryStorage.removeItem("salo-query-cache");
      }
      setSession(next);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [queryClient]);

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
          options: { redirectTo: `${window.location.origin}/` }
        });
        if (error) throw error;
      },
      sendEmailCode: async (email) => {
        if (!supabase) throw new Error("Supabase is not configured");
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/`
          }
        });
        if (error) throw error;
      },
      verifyEmailCode: async (email, token) => {
        if (!supabase) throw new Error("Supabase is not configured");
        const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
        if (error) throw error;
      },
      signOut: async () => {
        if (!supabase) return;
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        queryClient.clear();
        await queryStorage.removeItem("salo-query-cache");
      }
    }),
    [session, loading, queryClient]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
