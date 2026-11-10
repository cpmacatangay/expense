import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="onboarding">
      <h1 className="page-title">This screen does not exist.</h1>
      <p className="page-sub">Return to the ledger and try again.</p>
      <Link className="primary-action" to="/">
        Back to Home
      </Link>
    </main>
  );
}
