import { Component, type ErrorInfo, type ReactNode } from "react";
import { Icon } from "@/ui/primitives/Icon";

type State = { failed: boolean };

/**
 * Keeps a failed lazy route or render inside the shell instead of replacing the
 * whole app. Remounted per route so navigating away clears the failure.
 */
export class RouteErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Salo could not open this screen", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <section className="panel" role="alert">
          <h2 className="panel-title">This screen did not load.</h2>
          <p className="panel-copy">
            Try again. If it keeps happening, check your connection. Your ledger is safe on the
            server.
          </p>
          <div className="form-actions">
            <a className="secondary-action" href="/">
              <Icon name="chevron-left" />
              Back to Home
            </a>
            <button
              className="primary-action"
              type="button"
              onClick={() => window.location.reload()}
            >
              <Icon name="restore" />
              Reload Salo
            </button>
          </div>
        </section>
      );
    }

    return this.props.children;
  }
}
