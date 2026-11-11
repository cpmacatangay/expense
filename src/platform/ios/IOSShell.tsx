import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useGroup } from "@/features/groups/groupContext";
import { useOnlineStatus } from "@/features/realtime/useOnlineStatus";
import { TabIcon } from "@/ui/primitives/TabIcon";
import { tabItems } from "@/ui/primitives/tabs";
import "./iOSTokens.css";

export function IOSShell() {
  const { group } = useGroup();
  const location = useLocation();
  const online = useOnlineStatus();
  const isDetail = location.pathname.startsWith("/outings/");

  return (
    <div className={`ios-app${isDetail ? " is-detail" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="ios-head">
        <div className="ios-brand">
          <img
            className="ios-brand-mark"
            src="/brand/salo-symbol-mono-1f5c45.svg"
            alt="Salo"
          />
          <span className="ios-group">{group?.name ?? "Salo"}</span>
        </div>
      </header>

      {!online ? (
        <div className="offline-banner" role="status">
          Offline. Reads stay; shared changes need a connection.
        </div>
      ) : null}

      <main className="ios-main" id="main-content">
        <Outlet />
      </main>

      <nav className="ios-tabbar" aria-label="Main" hidden={isDetail}>
        {tabItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `ios-tab${isActive ? " is-active" : ""}`}
          >
            <TabIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
