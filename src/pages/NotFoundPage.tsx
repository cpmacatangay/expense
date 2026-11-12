import { Link } from "react-router-dom";
import { BrandMark } from "@/ui/primitives/BrandMark";
import { Icon } from "@/ui/primitives/Icon";

export function NotFoundPage() {
  return (
    <main className="onboarding">
      <BrandMark className="onboarding-mark" />
      <h1 className="page-title">This screen does not exist.</h1>
      <p className="page-sub">Return to the ledger and try again.</p>
      <Link className="primary-action" to="/">
        <Icon name="chevron-left" />
        Back to Home
      </Link>
    </main>
  );
}
