export function ActivityPage() {
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Activity</h1>
        <p className="page-sub">Everything that changed in Salo Crew.</p>
      </header>

      <section className="panel">
        <span className="panel-label">Activity</span>
        <h2 className="panel-title">Nothing has happened yet</h2>
        <p className="panel-copy">
          Outings, settlements, members, and audit events appear here once the group is connected.
        </p>
      </section>
    </div>
  );
}
