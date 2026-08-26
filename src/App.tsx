import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import AppLayout from "@/components/layout/AppLayout";
import AuthPage from "@/pages/auth";
import { useCurrentMember, setBackendSession, clearSession, type Member } from "@/lib/mock-store";
import api, { getSelectedCompanyId, setSelectedCompanyId } from "@/lib/api";
import Dashboard from "@/pages/dashboard";
import CRM from "@/pages/crm";
import DialerPage from "@/pages/dialer";
import TeamPage from "@/pages/team";
import WhatsappPage from "@/pages/whatsapp";
import ReportsPage from "@/pages/reports";
import PerformancePage from "@/pages/performance";
import AuditPage from "@/pages/audit";
import ToolsPage from "@/pages/tools";
import PipelinePage from "@/pages/pipeline";
import TasksPage from "@/pages/tasks";
import MarketingPage from "@/pages/marketing";
import MasterPage from "@/pages/master-dashboard/master-page";
import PBXPage from "@/pages/pbx";
import SubscribePage from "@/pages/subscribe";
import IntegrationPage from "@/pages/integration";
import PaymentPage from "@/pages/payment";
import RecordingPage from "@/pages/recording";
import SettingsPage from "@/pages/settings";
import GeneralSettingsPage from "@/pages/settings/general";
import CustomStatusPage from "@/pages/settings/custom-status";
import DefaultDialerPage from "@/pages/settings/default-dialer";
import MessageTemplatesPage from "@/pages/settings/message-templates";
import StoragePage from "@/pages/settings/storage";
import ChangePasswordPage from "@/pages/settings/change-password";
import { useEffect, useState } from "react";

function Root() {
  const [isReady, setIsReady] = useState(false);
  const [redirectTo, setRedirectTo] = useState("/auth");

  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('ifox_token') || sessionStorage.getItem('ifox_token');
      if (!token) {
        clearSession();
        setIsReady(true);
        return;
      }

      try {
        const res = await api.me();
        if (res?.user) {
          setBackendSession(res.user);
          const storedCompany = getSelectedCompanyId();
          if (res.user.role === 'SuperAdmin' && !storedCompany) {
            setSelectedCompanyId(null);
          }
          // ✅ Master goes straight to /master, everyone else to /dashboard
          setRedirectTo(res.user.role === 'Master' ? '/master' : '/dashboard');
        } else {
          localStorage.removeItem('ifox_token');
          localStorage.removeItem('ifox_user');
          sessionStorage.removeItem('ifox_token');
          sessionStorage.removeItem('ifox_user');
          document.cookie = 'ifox_token=; Max-Age=0; path=/';
          document.cookie = 'ifox_user=; Max-Age=0; path=/';
          clearSession();
        }
      } catch (err) {
        localStorage.removeItem('ifox_token');
        localStorage.removeItem('ifox_user');
        sessionStorage.removeItem('ifox_token');
        sessionStorage.removeItem('ifox_user');
        document.cookie = 'ifox_token=; Max-Age=0; path=/';
        document.cookie = 'ifox_user=; Max-Age=0; path=/';
        clearSession();
      }
      setIsReady(true);
    };

    validateToken();
  }, []);

  if (!isReady) return null;
  return <Navigate to={redirectTo} replace />;
}

const routeAccess: Record<string, Member["role"][]> = {
  "/dashboard": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/crm": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/dialer": ["Admin", "Manager", "Submanager", "Telecaller"],
  "/team": ["SuperAdmin", "Admin"],
  "/whatsapp": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/reports": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/performance": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/audit": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/tools": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/pipeline": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/tasks": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/marketing": ["SuperAdmin", "Admin"],
  "/pbx": ["SuperAdmin", "Admin"],
   "/master": ["Master"],
  "/subscribe": ["SuperAdmin", "Admin"],
  "/payment": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/settings/general": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/settings/custom-status": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/settings/default-dialer": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/settings/message-templates": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/settings/storage": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/settings/change-password": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/integration": ["SuperAdmin", "Admin"],
  "/recording": ["SuperAdmin", "Admin"],
  "/settings": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
};

const routePermissions: Record<string, keyof Member["permissions"]> = {
  "/crm": "crm", "/dialer": "crm", "/whatsapp": "whatsapp", "/reports": "reports",
  "/performance": "reports", "/audit": "reports", "/tools": "tools", "/pipeline": "tools",
  "/tasks": "tools", "/marketing": "marketing", "/pbx": "pbx", "/subscribe": "subscribe",
  "/payment": "payment", "/integration": "integration", "/recording": "recording", "/settings": "settings",
  "/team": "team",
};

function ProtectedLayout() {
  const member = useCurrentMember();
  const location = useLocation();
  if (!member) return <Navigate to="/auth" replace />;
  const allowed = routeAccess[location.pathname] ?? ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"];
  const permissionKey = routePermissions[location.pathname] || (
    location.pathname.startsWith("/settings/") ? routePermissions["/settings"] : undefined
  );
  const hasPermission = !permissionKey || ["Master", "SuperAdmin", "Admin"].includes(member.role) || member.permissions[permissionKey];
  if (!allowed.includes(member.role) || !hasPermission) {
    // ✅ Master gets sent back to /master, not /dashboard (which it can't access either)
    return <Navigate to={member.role === "Master" ? "/master" : "/dashboard"} replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/" element={<Root />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route element={<AppLayout />}>
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/dialer" element={<DialerPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/whatsapp" element={<WhatsappPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/marketing" element={<MarketingPage />} />
            <Route path="/pbx" element={<PBXPage />} />
            <Route path="/master" element={<MasterPage />} />
            <Route path="/subscribe" element={<SubscribePage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/integration" element={<IntegrationPage />} />
            <Route path="/recording" element={<RecordingPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/general" element={<GeneralSettingsPage />} />
            <Route path="/settings/custom-status" element={<CustomStatusPage />} />
            <Route path="/settings/default-dialer" element={<DefaultDialerPage />} />
            <Route path="/settings/message-templates" element={<MessageTemplatesPage />} />
            <Route path="/settings/storage" element={<StoragePage />} />
            <Route path="/settings/change-password" element={<ChangePasswordPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
