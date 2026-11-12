import { Component, type ErrorInfo, type ReactNode } from "react";
import { clearGroupSnapshot } from "@/data/cache/groupSnapshot";
import { queryStorage } from "@/data/cache/queryStorage";
import { BrandMark } from "@/ui/primitives/BrandMark";
import { Icon } from "@/ui/primitives/Icon";

type State = { failed: boolean };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Salo could not render", error, info.componentStack);
  }

  private async resetAndReload() {
    try {
      await queryStorage.removeItem("salo-query-cache");
    } catch {
      // A blocked IndexedDB should not stop the reload.
    }
    try {
      await clearGroupSnapshot();
    } catch {
      // The snapshot is best-effort.
    }
    window.location.reload();
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="onboarding">
          <BrandMark className="onboarding-mark" />
          <h1 className="page-title">Something broke at this table.</h1>
          <p className="page-sub">
            The shared ledger hit an unexpected state. Reloading clears the local copy and fetches
            the latest one.
          </p>
          <button
            className="primary-action"
            type="button"
            onClick={() => void this.resetAndReload()}
          >
            <Icon name="restore" />
            Reload Salo
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
