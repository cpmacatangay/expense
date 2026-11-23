import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { claimInvite } from "@/features/me/api";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/usePageTitle";
import { Icon } from "@/ui/primitives/Icon";

export function InvitePage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const queryClient = useQueryClient();
  const claimed = useRef(false);
  const [state, setState] = useState<"idle" | "claiming" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  usePageTitle("Invite");

  useEffect(() => {
    if (!token || claimed.current) return;
    claimed.current = true;
    setState("claiming");

    claimInvite(token)
      .then(async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["me"] }),
          queryClient.invalidateQueries({ queryKey: ["people"] }),
          queryClient.invalidateQueries({ queryKey: ["expenses"] }),
          queryClient.invalidateQueries({ queryKey: ["ledger"] }),
          queryClient.invalidateQueries({ queryKey: ["activity", "recent"] })
        ]);
        setState("done");
      })
      .catch((caught) => {
        setError(getErrorMessage(caught, "This invite is no longer available."));
        setState("error");
      });
  }, [token, queryClient]);

  return (
    <main className="onboarding">
      <h1 className="page-title">
        {state === "done" ? "You're in." : "Joining the ledger."}
      </h1>
      <p className="page-sub">
        {!token
          ? "This link is missing its invite token. Ask for a new link."
          : state === "claiming"
            ? "Checking the invite."
            : state === "error"
              ? error
              : "Your expenses are ready."}
      </p>
      {state === "done" ? (
        <Link className="primary-action" to="/">
          <Icon name="home" />
          Go to Home
        </Link>
      ) : null}
      {state === "error" ? (
        <Link className="text-action" to="/">
          <Icon name="chevron-left" />
          Back to Home
        </Link>
      ) : null}
    </main>
  );
}
