import { Suspense, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { RouteErrorBoundary } from "@/app/RouteErrorBoundary";
import { GroupSwitcher } from "@/features/groups/GroupSwitcher";
import { useGroup } from "@/features/groups/groupContext";
import { useOnlineStatus } from "@/features/realtime/useOnlineStatus";
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
  const { group, error, refresh } = useGroup();
  const location = useLocation();
  const online = useOnlineStatus();
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const isDetail = location.pathname.startsWith("/outings/");

  return (
    <div className={`app${isDetail ? " is-detail" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="app-head">
        <div className="app-brand">
          <BrandMark />
          <div className="app-brand-copy">
            <span className="app-name">Salo</span>
            {group ? (
              <button
                className="app-group app-group-button"
                type="button"
                onClick={() => setSwitcherOpen(true)}
                aria-label={`Switch table. Current table: ${group.name}`}
              >
                <span className="app-group-name">{group.name}</span>
                <Icon name="chevron-down" size={12} />
              </button>
            ) : (
              <span className="app-group">No table yet</span>
            )}
          </div>
        </div>
        <span className="app-head-meta">{online ? todayLabel() : "Offline"}</span>
      </header>

      {!online ? (
        <div className="offline-banner" role="status">
          No connection. Changes need a connection.
        </div>
      ) : null}

      {error && group && online ? (
        <div className="refresh-banner" role="status">
          <span>Could not refresh. Try again.</span>
          <button className="text-action" type="button" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      ) : null}

      <nav className="app-nav" aria-label="Main" hidden={isDetail || !group}>
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
          <Suspense
            fallback={
              <p className="panel-copy">
                Loading the table…
              </p>
            }
          >
            <Outlet />
          </Suspense>
        </RouteErrorBoundary>
      </main>

      <GroupSwitcher open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
    </div>
  );
}
