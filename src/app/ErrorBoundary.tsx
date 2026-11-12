import { Component, type ErrorInfo, type ReactNode } from "react";
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

  render() {
    if (this.state.failed) {
      return (
        <main className="onboarding">
          <BrandMark className="onboarding-mark" />
          <h1 className="page-title">Something broke at this table.</h1>
          <p className="page-sub">
            The shared ledger hit an unexpected state. Reload Salo to read the latest copy.
          </p>
          <button className="primary-action" type="button" onClick={() => window.location.reload()}>
            <Icon name="restore" />
            Reload Salo
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}
