import { useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/authContext";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";
import { BrandMark } from "@/ui/primitives/BrandMark";
import { Icon } from "@/ui/primitives/Icon";

export function SignInPage() {
  const { configured, signInWithGoogle } = useAuth();
  const location = useLocation();
  const joining = location.pathname.startsWith("/join");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePageTitle(joining ? "Join expense" : "Sign in");

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (caught) {
      setError(getErrorMessage(caught, "Google sign-in failed"));
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <main className="onboarding">
        <BrandMark className="onboarding-mark" />
        <h1 className="page-title">Salo is not configured.</h1>
        <p className="page-sub">
          Add <strong>VITE_SUPABASE_URL</strong> and <strong>VITE_SUPABASE_ANON_KEY</strong> to the
          environment, then reload.
        </p>
      </main>
    );
  }

  return (
    <main className="onboarding">
      <BrandMark className="onboarding-mark" />
      <h1 className="page-title">
        {joining ? "Someone shared an expense." : "Eat together. Settle once."}
      </h1>
      <p className="page-sub">
        {joining
          ? "Sign in with Google to claim your name and see the share already recorded for you."
          : "One shared ledger for friends. Sign in with Google to see what you owe and who owes you."}
      </p>

      {error ? (
        <p className="form-error" role="alert" id="signin-error">
          {error}
        </p>
      ) : null}

      <button className="primary-action" type="button" onClick={handleGoogle} disabled={busy}>
        <Icon name="log-in" />
        Continue with Google
      </button>

      <p className="onboarding-note">
        {joining
          ? "You will go straight back to the shared expense after signing in."
          : "New here? Sign in with Google. A friend can share an expense link with you."}
      </p>
    </main>
  );
}
