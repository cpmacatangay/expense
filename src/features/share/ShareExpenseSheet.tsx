import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getErrorMessage } from "@/lib/errors";
import { Sheet } from "@/ui/primitives/Sheet";
import { Icon } from "@/ui/primitives/Icon";
import { createExpenseShare, expenseShareUrl } from "./api";

function formatExpiry(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "soon";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric"
  }).format(date);
}

export function ShareExpenseSheet({
  open,
  expenseId,
  pendingNames = [],
  onClose
}: {
  open: boolean;
  expenseId: string;
  pendingNames?: string[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareQuery = useQuery({
    queryKey: ["expense-share", expenseId],
    queryFn: () => createExpenseShare(expenseId),
    enabled: open,
    staleTime: 0,
    gcTime: 60_000
  });

  useEffect(() => {
    if (!open) {
      setCopied(false);
      setError(null);
    }
  }, [open]);

  const share = shareQuery.data;
  const url = share ? expenseShareUrl(share.token) : "";

  async function copyLink() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setError("Could not copy. Select the link and copy it.");
    }
  }

  async function nativeShare() {
    if (!url) return;
    try {
      await navigator.share({
        title: "Salo expense",
        text: "Join this expense on Salo.",
        url
      });
    } catch (caught) {
      if (caught instanceof Error && caught.name !== "AbortError") {
        setError("Could not open the share sheet. Copy the link instead.");
      }
    }
  }

  async function refreshLink() {
    setRefreshing(true);
    setError(null);
    try {
      const next = await createExpenseShare(expenseId, true);
      queryClient.setQueryData(["expense-share", expenseId], next);
      setCopied(false);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not refresh the link"));
    } finally {
      setRefreshing(false);
    }
  }

  const loadError = shareQuery.error
    ? getErrorMessage(shareQuery.error, "Could not create the link")
    : null;

  return (
    <Sheet open={open} onClose={onClose} title="Share this expense">
      <div className="stack">
        <p className="panel-copy">
          Send this link to the people on the expense. They sign in with Google, claim their
          name, and see the share already recorded for them.
        </p>

        {pendingNames.length > 0 ? (
          <p className="panel-copy">
            Waiting to join: <strong>{pendingNames.join(", ")}</strong>.
          </p>
        ) : (
          <p className="panel-copy">Everyone listed on this expense has joined.</p>
        )}

        {shareQuery.isLoading ? <p className="panel-copy">Creating the link.</p> : null}
        {loadError ? (
          <p className="form-error" role="alert">
            {loadError}
          </p>
        ) : null}

        {share ? (
          <>
            <label className="field">
              <span>Expense link</span>
              <input
                readOnly
                value={url}
                onFocus={(event) => event.currentTarget.select()}
              />
            </label>
            <div className="form-actions">
              <button className="primary-action" type="button" onClick={() => void copyLink()}>
                <Icon name={copied ? "check" : "copy"} />
                {copied ? "Copied" : "Copy link"}
              </button>
              {typeof navigator !== "undefined" && typeof navigator.share === "function" ? (
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => void nativeShare()}
                >
                  <Icon name="share" />
                  Share
                </button>
              ) : null}
            </div>
            <p className="panel-copy">
              The link expires on {formatExpiry(share.expiresAt)}.
            </p>
            <button
              className="text-action"
              type="button"
              onClick={() => void refreshLink()}
              disabled={refreshing}
            >
              <Icon name="restore" />
              {refreshing ? "Refreshing." : "Refresh link"}
            </button>
            <p className="form-notice">
              Refreshing makes the current link stop working. Use it if the link was shared
              somewhere public.
            </p>
          </>
        ) : null}

        {error ? (
          <p className="form-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Sheet>
  );
}
