import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { useAuth } from "@/features/auth/authContext";
import { SignInPage } from "@/features/auth/SignInPage";
import { GroupProvider } from "@/features/groups/GroupProvider";
import { GroupSetupPage } from "@/features/groups/GroupSetupPage";
import { SettingsPage } from "@/features/groups/SettingsPage";
import { useGroup } from "@/features/groups/groupContext";
import { OutingEditorPage } from "@/features/outings/OutingEditorPage";
import { useGroupRealtime } from "@/features/realtime/useGroupRealtime";
import { ActivityPage } from "@/pages/ActivityPage";
import { HistoryPage } from "@/pages/HistoryPage";
import { HomePage } from "@/pages/HomePage";
import { LedgerPage } from "@/pages/LedgerPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlatformShell } from "@/platform/PlatformShell";
import { SplashScreen } from "@/ui/primitives/SplashScreen";

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
  const { loading, group, refresh } = useGroup();
  useGroupRealtime(group?.id, refresh);

  if (loading) return <SplashScreen />;
  if (!group) return <GroupSetupPage />;

  return (
    <Routes>
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route element={<PlatformShell />}>
        <Route index element={<HomePage />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="outings/:outingId" element={<OutingEditorPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
