import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { formatPeso } from "@/domain/money/format";
import { useAuth } from "@/features/auth/authContext";
import { useGroup } from "@/features/groups/groupContext";
import { createOuting, listOutings, todayInManila } from "@/features/outings/api";
import { formatDate } from "@/lib/dates";
import { getErrorMessage } from "@/lib/errors";
import { initials } from "@/lib/names";

export function HomePage() {
  const { user } = useAuth();
  const { profile, group, adults } = useGroup();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: outings, isLoading } = useQuery({
    queryKey: ["outings", group?.id],
    queryFn: () => listOutings(group?.id as string),
    enabled: Boolean(group?.id)
  });

  const firstName =
    profile?.display_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
  const activeAdults = adults.filter((adult) => adult.status === "active");
  const pendingAdults = adults.filter((adult) => adult.status === "pending");

  async function handleNewOuting() {
    if (!group || !profile) return;
    setCreating(true);
    setError(null);
    try {
      const outing = await createOuting({
        groupId: group.id,
        authorProfileId: profile.id,
        date: todayInManila(),
        presentAdultIds: activeAdults.map((adult) => adult.id)
      });
      await queryClient.invalidateQueries({ queryKey: ["outings", group.id] });
      navigate(`/outings/${outing.id}`);
    } catch (caught) {
      setError(getErrorMessage(caught, "Could not start the outing"));
      setCreating(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Hi, {firstName}</h1>
        <p className="page-sub">
          {group?.name ?? "Salo"} · {activeAdults.length} at the table
        </p>
      </header>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="home-lead">
        <section className="panel balance-anchor" aria-label="Your balance">
          <span className="panel-label">Your balance</span>
          <div className="balance-amount">{formatPeso(0)}</div>
          <p className="panel-copy">No finalized outings yet.</p>
        </section>
        <button
          className="primary-action"
          type="button"
          onClick={() => void handleNewOuting()}
          disabled={creating}
        >
          {creating ? "Starting…" : "New outing"}
        </button>
      </div>

      <section className="panel">
        <span className="panel-label">Outings</span>
        <h2 className="panel-title">Recent outings</h2>
        {isLoading ? <p className="panel-copy">Loading outings…</p> : null}
        {!isLoading && outings?.length === 0 ? (
          <p className="panel-copy">No outings yet. Start the first shared meal.</p>
        ) : null}
        <div className="outing-list">
          {outings?.map((outing) => (
            <Link className="outing-link" key={outing.id} to={`/outings/${outing.id}`}>
              <span>
                <strong>{outing.place || "Untitled outing"}</strong>
                <span className="row-sub">
                  {formatDate(outing.date)} · {outing.status}
                </span>
              </span>
              <span className="amount">{formatPeso(outing.total_centavos)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="panel" aria-label="Your table">
        <span className="panel-label">Your table</span>
        <div className="member-strip">
          {adults
            .filter((adult) => adult.status !== "removed")
            .map((adult) => (
              <span className="member" key={adult.id}>
                <span className="member-initials" style={{ background: adult.color }}>
                  {initials(adult.display_name)}
                </span>
                <span className="member-name">{adult.display_name}</span>
                {adult.status === "pending" ? <span className="member-status">Pending</span> : null}
              </span>
            ))}
        </div>
        {pendingAdults.length > 0 ? (
          <p className="panel-copy">
            {pendingAdults.length} {pendingAdults.length === 1 ? "adult is" : "adults are"} still
            pending.
          </p>
        ) : null}
        <Link className="text-action" to="/settings">
          Invite adults and add students
        </Link>
      </section>
    </div>
  );
}
