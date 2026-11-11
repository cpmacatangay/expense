import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useGroup } from "@/features/groups/groupContext";
import { useOnlineStatus } from "@/features/realtime/useOnlineStatus";
import { TabIcon } from "@/ui/primitives/TabIcon";
import { tabItems } from "@/ui/primitives/tabs";
import "./androidTokens.css";

export function AndroidShell() {
  const { group } = useGroup();
  const location = useLocation();
  const online = useOnlineStatus();
  const isDetail = location.pathname.startsWith("/outings/");

  return (
    <div className={`android-app${isDetail ? " is-detail" : ""}`}>
      <header className="android-head">
        <div className="android-brand">
          <img
            className="android-brand-mark"
            src="/brand/salo-symbol-mono-1f5c45.svg"
            alt="Salo"
          />
          <span className="android-group">{group?.name ?? "Salo"}</span>
        </div>
      </header>

      {!online ? (
        <div className="offline-banner" role="status">
          Offline. Reads stay; shared changes need a connection.
        </div>
      ) : null}

      <main className="android-main">
        <Outlet />
      </main>

      <nav className="android-nav" aria-label="Main" hidden={isDetail}>
        {tabItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => `android-tab${isActive ? " is-active" : ""}`}
          >
            <TabIcon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
