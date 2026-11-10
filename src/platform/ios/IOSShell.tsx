import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useGroup } from "@/features/groups/groupContext";
import { TabIcon } from "@/ui/primitives/TabIcon";
import { tabItems } from "@/ui/primitives/tabs";
import "./iOSTokens.css";

export function IOSShell() {
  const { group } = useGroup();
  const location = useLocation();
  const isDetail = location.pathname.startsWith("/outings/");

  return (
    <div className={`ios-app${isDetail ? " is-detail" : ""}`}>
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

      <main className="ios-main">
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
