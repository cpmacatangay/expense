import { NavLink, Outlet, useLocation } from "react-router-dom";
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
  const { group } = useGroup();
  const location = useLocation();
  const online = useOnlineStatus();
  const isDetail =
    location.pathname.startsWith("/outings/") || location.pathname.startsWith("/drafts/");

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
            <span className="app-group">{group?.name ?? "Shared table"}</span>
          </div>
        </div>
        <span className="app-head-meta">{online ? todayLabel() : "Offline"}</span>
      </header>

      {!online ? (
        <div className="offline-banner" role="status">
          Offline. Reads stay; shared changes need a connection.
        </div>
      ) : null}

      <nav className="app-nav" aria-label="Main" hidden={isDetail}>
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

      <main className="app-main" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
