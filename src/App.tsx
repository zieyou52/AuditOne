import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import AppLayout from '@/components/layout/AppLayout';
import LoginPage from '@/pages/LoginPage';
import OrgSelectPage from '@/pages/OrgSelectPage';
import DashboardPage from '@/pages/DashboardPage';
import AccountingPage from '@/pages/AccountingPage';
import PermissionsPage from '@/pages/PermissionsPage';
import BudgetPage from '@/pages/BudgetPage';
import AuditPage from '@/pages/AuditPage';
import PublicLedgerPage from '@/pages/PublicLedgerPage';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { session, loading } = useAuth();
  if (loading) return <div className="p-8 text-sm text-neutral-500">불러오는 중…</div>;
  if (!session) return <Navigate to="/login" replace />;
  return children;
}

function RequireOrg({ children }: { children: JSX.Element }) {
  const { org } = useAuth();
  if (!org) return <Navigate to="/orgs" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* 공개 (비로그인) */}
      <Route path="/public/:orgId" element={<PublicLedgerPage />} />
      <Route path="/login" element={<LoginPage />} />

      {/* 인증 필요 */}
      <Route
        path="/orgs"
        element={
          <RequireAuth>
            <OrgSelectPage />
          </RequireAuth>
        }
      />

      {/* 단체 워크스페이스 */}
      <Route
        element={
          <RequireAuth>
            <RequireOrg>
              <AppLayout />
            </RequireOrg>
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/accounting" element={<AccountingPage />} />
        <Route path="/budget" element={<BudgetPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/permissions" element={<PermissionsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
