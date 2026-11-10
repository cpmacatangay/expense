import { useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/data/supabase/client";
import { AuthContext, type AuthContextValue } from "./authContext";
import type { Session } from "@supabase/supabase-js";

export function AuthProvider({ children }: { children: ReactNode }) {
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

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

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
      }
    }),
    [session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
