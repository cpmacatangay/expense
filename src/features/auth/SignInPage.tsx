import { useState, type FormEvent } from "react";
import { useAuth } from "@/features/auth/authContext";
import { env } from "@/lib/env";
import { getErrorMessage } from "@/lib/errors";
import { Icon } from "@/ui/primitives/Icon";

export function SignInPage() {
  const { configured, signInWithGoogle, sendEmailCode, verifyEmailCode } = useAuth();
  const emailEnabled = env.VITE_EMAIL_AUTH_ENABLED !== "false";
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  async function handleSendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await sendEmailCode(email.trim());
      setStep("code");
      setNotice(`Code sent to ${email.trim()}.`);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not send the code"));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await verifyEmailCode(email.trim(), code.trim());
    } catch (caught) {
      setError(getErrorMessage(caught, "That code did not work"));
      setBusy(false);
    }
  }

  if (!configured) {
    return (
      <main className="onboarding">
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
      <img className="onboarding-mark" src="/brand/salo-symbol-mono-1f5c45.svg" alt="" />
      <h1 className="page-title">Eat together. Settle once.</h1>
      <p className="page-sub">
        One shared ledger for the table. Sign in so every adult sees the same balance.
      </p>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="form-notice">{notice}</p> : null}

      <button className="primary-action" type="button" onClick={handleGoogle} disabled={busy}>
        <Icon name="log-in" />
        Continue with Google
      </button>

      {emailEnabled ? (
        <>
          <p className="divider">or use an email code</p>

          {step === "email" ? (
            <form className="auth-form" onSubmit={handleSendCode}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              <button className="secondary-action" type="submit" disabled={busy || !email.trim()}>
                <Icon name="mail" />
                Email me a code
              </button>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleVerify}>
              <label className="field">
                <span>Six-digit code</span>
                <input
                  type="text"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="000000"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                />
              </label>
              <button
                className="secondary-action"
                type="submit"
                disabled={busy || code.trim().length < 6}
              >
                <Icon name="check" />
                Verify code
              </button>
              <button
                className="text-action"
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setNotice(null);
                }}
              >
                <Icon name="chevron-left" />
                Use a different email
              </button>
            </form>
          )}
        </>
      ) : (
        <p className="form-notice">Email sign-in is coming soon. Use Google for now.</p>
      )}

      <p className="onboarding-note">
        {emailEnabled
          ? "No Apple sign-in. Email codes use the group's SMTP and may take a minute."
          : "No Apple sign-in. Email sign-in will be enabled when a sending domain is ready."}
      </p>
    </main>
  );
}
