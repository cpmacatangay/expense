import { lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { useAuth } from "@/features/auth/authContext";
import { SignInPage } from "@/features/auth/SignInPage";
import { GroupProvider } from "@/features/groups/GroupProvider";
import { useGroup } from "@/features/groups/groupContext";
import { useGroupRealtime } from "@/features/realtime/useGroupRealtime";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlatformShell } from "@/platform/PlatformShell";
import { BrandMark } from "@/ui/primitives/BrandMark";
import { Icon } from "@/ui/primitives/Icon";
import { SplashScreen } from "@/ui/primitives/SplashScreen";

const HomePage = lazy(() =>
  import("@/pages/HomePage").then((module) => ({ default: module.HomePage }))
);
const LedgerPage = lazy(() =>
  import("@/pages/LedgerPage").then((module) => ({ default: module.LedgerPage }))
);
const ExpensesPage = lazy(() =>
  import("@/pages/ExpensesPage").then((module) => ({ default: module.ExpensesPage }))
);
const SettingsPage = lazy(() =>
  import("@/features/groups/SettingsPage").then((module) => ({ default: module.SettingsPage }))
);
const OutingEditorPage = lazy(() =>
  import("@/features/outings/OutingEditorPage").then((module) => ({
    default: module.OutingEditorPage
  }))
);

export function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { loading, session } = useAuth();

  if (loading) return <SplashScreen />;
  if (!session) return <SignInPage />;

  return (
    <GroupProvider>
      <GroupGate />
    </GroupProvider>
  );
}

function GroupGate() {
  const { loading, group, groups, error, refresh } = useGroup();
  const location = useLocation();
  useGroupRealtime(group?.id, refresh);

  if (loading) return <SplashScreen />;

  if (error && groups.length === 0) {
    return (
      <main className="onboarding">
        <BrandMark className="onboarding-mark" />
        <h1 className="page-title">Could not load your tables.</h1>
        <p className="page-sub" role="alert">
          {error}
        </p>
        <button className="primary-action" type="button" onClick={() => void refresh()}>
          <Icon name="restore" />
          Try again
        </button>
      </main>
    );
  }

  if (groups.length === 0 && location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  return (
    <Routes>
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route element={<PlatformShell />}>
        <Route index element={<HomePage />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="expenses" element={<ExpensesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="outings/:outingId" element={<OutingEditorPage />} />
      </Route>
      <Route path="history" element={<Navigate to="/expenses" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
