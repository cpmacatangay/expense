import { Suspense } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { RouteErrorBoundary } from "@/app/RouteErrorBoundary";
import { useOnlineStatus } from "@/features/realtime/useOnlineStatus";
import { useLedgerRealtime } from "@/features/realtime/useLedgerRealtime";
import { BrandMark } from "@/ui/primitives/BrandMark";
import { Icon } from "@/ui/primitives/Icon";
import { tabItems } from "@/ui/primitives/tabs";

function todayLabel() {
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila"
  }).format(new Date());
}

export function PlatformShell() {
  const location = useLocation();
  const online = useOnlineStatus();
  useLedgerRealtime();
  const isPushed =
    (location.pathname.startsWith("/expenses/") && location.pathname !== "/expenses") ||
    location.pathname.startsWith("/join");

  return (
    <div className={`app${isPushed ? " is-detail" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="app-head">
        <div className="app-brand">
          <BrandMark />
          <div className="app-brand-copy">
            <span className="app-name">Salo</span>
            <span className="app-group">Friends ledger</span>
          </div>
        </div>
        <span className="app-head-meta">{online ? todayLabel() : "Offline"}</span>
      </header>

      {!online ? (
        <div className="offline-banner" role="status">
          No connection. Changes need a connection.
        </div>
      ) : null}

      <nav className="app-nav" aria-label="Main" hidden={isPushed}>
        {tabItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `app-tab${isActive ? " is-active" : ""}`}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <main className="app-main" id="main-content" tabIndex={-1}>
        <RouteErrorBoundary key={location.pathname}>
          <Suspense fallback={<p className="panel-copy">Loading your ledger.</p>}>
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </main>
    </div>
  );
}
