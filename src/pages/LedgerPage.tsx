export function LedgerPage() {
  return (
    <div className="page">
      <header className="page-head">
        <h1 className="page-title">Ledger</h1>
        <p className="page-sub">Balances carry over until you settle.</p>
      </header>

      <section className="panel">
        <span className="panel-label">Ledger</span>
        <h2 className="panel-title">Nothing to settle yet</h2>
        <p className="panel-copy">
          The live group balances, who-owes-whom rows, and settlement history arrive in M2.
        </p>
      </section>
    </div>
  );
}
