import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { useAuth } from "@/features/auth/authContext";
import { SignInPage } from "@/features/auth/SignInPage";
import { useMe } from "@/features/me/useMe";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PlatformShell } from "@/platform/PlatformShell";
import { BrandMark } from "@/ui/primitives/BrandMark";
import { Icon } from "@/ui/primitives/Icon";
import { SplashScreen } from "@/ui/primitives/SplashScreen";

const HomePage = lazy(() =>
  import("@/pages/HomePage").then((module) => ({ default: module.HomePage }))
);
const AllExpensesPage = lazy(() =>
  import("@/pages/AllExpensesPage").then((module) => ({ default: module.AllExpensesPage }))
);
const LedgerPage = lazy(() =>
  import("@/pages/LedgerPage").then((module) => ({ default: module.LedgerPage }))
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((module) => ({ default: module.SettingsPage }))
);
const JoinExpensePage = lazy(() =>
  import("@/pages/JoinExpensePage").then((module) => ({ default: module.JoinExpensePage }))
);
const ExpenseEditorPage = lazy(() =>
  import("@/features/expenses/ExpenseEditorPage").then((module) => ({
    default: module.ExpenseEditorPage
  }))
);
const ExpenseDetailPage = lazy(() =>
  import("@/features/expenses/ExpenseDetailPage").then((module) => ({
    default: module.ExpenseDetailPage
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
  return <MeGate />;
}

function MeGate() {
  const { data, error, isLoading, refetch } = useMe();

  if (isLoading) return <SplashScreen />;

  if (error) {
    return (
      <main className="onboarding">
        <BrandMark className="onboarding-mark" />
        <h1 className="page-title">Could not load your ledger.</h1>
        <p className="page-sub" role="alert">
          {error instanceof Error ? error.message : "Try again when you are connected."}
        </p>
        <button className="primary-action" type="button" onClick={() => void refetch()}>
          <Icon name="restore" />
          Try again
        </button>
      </main>
    );
  }

  if (!data) return <SplashScreen />;

  return (
    <Routes>
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route element={<PlatformShell />}>
        <Route index element={<HomePage />} />
        <Route path="expenses" element={<AllExpensesPage />} />
        <Route path="expenses/new" element={<ExpenseEditorPage />} />
        <Route path="expenses/:expenseId" element={<ExpenseDetailPage />} />
        <Route path="expenses/:expenseId/edit" element={<ExpenseEditorPage />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="join/:token" element={<JoinExpensePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
