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
import WhatsappTemplatesPage from "@/pages/whatsapp-templates";
import WhatsappAutomationPage from "@/pages/whatsapp-automation";
import BroadcastPage from "@/pages/broadcast";
import WhatsappReportsPage from "@/pages/whatsapp-reports";
import WhatsappSettingsPage from "@/pages/whatsapp-settings";
import ReportsPage from "@/pages/reports";
import SummaryPage from "@/pages/summary";
import DispositionReportPage from "@/pages/disposition-report";
import ProductivityV2Page from "@/pages/productivity";
import GamePage from "@/pages/game";
import ProductivityAttendancePage from "@/pages/productivity-attendance";
import PerformancePage from "@/pages/performance";
import AuditPage from "@/pages/audit";
import ToolsPage from "@/pages/tools";
import PipelinePage from "@/pages/pipeline";
import TasksPage from "@/pages/tasks";
import AutomationPage from "@/pages/automation";
import StagesPage from "@/pages/stages";
import FormPage from "@/pages/form";
import ProductsPage from "@/pages/products";
import WebDialerPage from "@/pages/webdialer";
import MarketingPage from "@/pages/marketing";
import GoPagesV2Page from "@/pages/gopages";
import SurveyInPage from "@/pages/voice-broadcast";
import IntegrateFormPage from "@/pages/web_form";
import MasterDashboardPage from "@/pages/master-dashboard/dashboard";
import MasterPage from "@/pages/master-dashboard/master-page";
import MasterTenantsPage from "@/pages/master-dashboard/tenants";
import MasterUsersPage from "@/pages/master-dashboard/users";
import MasterCallsPage from "@/pages/master-dashboard/calls";
import MasterAnalyticsPage from "@/pages/master-dashboard/analytics";
import MasterBillingPage from "@/pages/master-dashboard/billing";
import MasterTelephonyPage from "@/pages/master-dashboard/telephony";
import MasterCompliancePage from "@/pages/master-dashboard/compliance";
import MasterAlertsPage from "@/pages/master-dashboard/alerts";
import MasterSupportPage from "@/pages/master-dashboard/support";
import SupportPage from "@/pages/support";
import MasterSettingsPage from "@/pages/master-dashboard/settings";
import MasterPortalAccessPage from "@/pages/master-dashboard/portal-access";
import MasterModuleAccessPage from "@/pages/master-dashboard/module-access";
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
          const role = String(res.user.role || '').toLowerCase();
          if (role === 'superadmin' && !storedCompany) {
            setSelectedCompanyId(null);
          }
          // Master uses the master console; SuperAdmin trial and paid accounts
          // use the normal portal with SuperAdmin navigation.
          setRedirectTo(role === 'master' ? '/master' : '/dashboard');
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
  "/whatsapp-templates": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/whatsapp-automation": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/broadcast": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/whatsapp-reports": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/whatsapp-settings": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/reports": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/summary": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/disposition-report": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/productivity": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/game": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/productivity-attendance": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/performance": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/audit": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/tools": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/automation": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/pipeline": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/stages": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/tasks": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/form": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/products": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/webdialer": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
  "/marketing": ["SuperAdmin", "Admin", "Telecaller"],
  "/gopages": ["SuperAdmin", "Admin", "Telecaller"],
  "/gopagesv2": ["SuperAdmin", "Admin"],
  "/web_form": ["SuperAdmin", "Admin", "Telecaller"],
  "/voice-broadcast": ["SuperAdmin", "Admin", "Telecaller"],
  "/survey-in": ["SuperAdmin", "Admin"],
  "/integrate_form": ["SuperAdmin", "Admin"],
  "/pbx": ["SuperAdmin", "Admin"],
  "/master": ["Master"],
  "/master/dashboard": ["Master"],
  "/master/master": ["Master"],
  "/master/tenants": ["Master"],
  "/master/users": ["Master"],
  "/master/calls": ["Master"],
  "/master/analytics": ["Master"],
  "/master/billing": ["Master"],
  "/master/telephony": ["Master"],
  "/master/compliance": ["Master"],
  "/master/alerts": ["Master"],
  "/master/support": ["Master"],
  "/master/settings": ["Master"],
  "/master/portal-access": ["Master"],
  "/master/module-access": ["Master"],
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
  "/support": ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"],
};

const routePermissions: Record<string, keyof Member["permissions"]> = {
  "/crm": "crm", "/dialer": "crm", "/whatsapp": "whatsapp", "/whatsapp-templates": "whatsapp",
  "/whatsapp-automation": "whatsapp", "/broadcast": "whatsapp", "/whatsapp-reports": "whatsapp",
  "/whatsapp-settings": "whatsapp", "/reports": "reports",
  "/summary": "reports", "/disposition-report": "reports", "/productivity": "reports",
  "/game": "reports", "/productivity-attendance": "reports", "/performance": "reports",
  "/audit": "reports", "/tools": "tools", "/automation": "tools",
  "/pipeline": "tools", "/stages": "tools", "/tasks": "tools", "/form": "tools",
  "/products": "tools", "/webdialer": "tools", "/marketing": "marketing",
  "/gopages": "marketing", "/web_form": "marketing", "/voice-broadcast": "marketing",
  "/gopagesv2": "marketing", "/survey-in": "marketing", "/integrate_form": "marketing",
  "/pbx": "pbx", "/subscribe": "subscribe", "/payment": "payment", "/integration": "integration",
  "/recording": "recording", "/settings": "settings", "/support": "settings", "/team": "team",
};

function ProtectedLayout() {
  const member = useCurrentMember();
  const location = useLocation();
  if (!member) return <Navigate to="/auth" replace />;
  const isMasterRoute = location.pathname === "/master" || location.pathname.startsWith("/master/");
  const allowed = routeAccess[location.pathname] ?? (
    isMasterRoute ? ["Master"] : ["SuperAdmin", "Admin", "Manager", "Submanager", "Telecaller"]
  );
  const permissionKey = routePermissions[location.pathname] || (
    location.pathname.startsWith("/settings/") ? routePermissions["/settings"] : undefined
  );
  const hasPermission = !permissionKey || member.role === "Master" || member.role === "SuperAdmin" || member.permissions[permissionKey];
  if (!allowed.includes(member.role) || !hasPermission) {
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
            <Route path="/whatsapp-templates" element={<WhatsappTemplatesPage />} />
            <Route path="/whatsapp-automation" element={<WhatsappAutomationPage />} />
            <Route path="/broadcast" element={<BroadcastPage />} />
            <Route path="/whatsapp-reports" element={<WhatsappReportsPage />} />
            <Route path="/whatsapp-settings" element={<WhatsappSettingsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/summary" element={<SummaryPage />} />
            <Route path="/disposition-report" element={<DispositionReportPage />} />
            <Route path="/productivity" element={<ProductivityV2Page />} />
            <Route path="/game" element={<GamePage />} />
            <Route path="/productivity-attendance" element={<ProductivityAttendancePage />} />
            <Route path="/performance" element={<PerformancePage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/tools" element={<ToolsPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/stages" element={<StagesPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/form" element={<FormPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/webdialer" element={<WebDialerPage />} />
            <Route path="/marketing" element={<MarketingPage />} />
            <Route path="/gopages" element={<GoPagesV2Page />} />
            <Route path="/gopagesv2" element={<GoPagesV2Page />} />
            <Route path="/web_form" element={<IntegrateFormPage />} />
            <Route path="/voice-broadcast" element={<SurveyInPage />} />
            <Route path="/survey-in" element={<SurveyInPage />} />
            <Route path="/integrate_form" element={<IntegrateFormPage />} />
            <Route path="/pbx" element={<PBXPage />} />
            <Route path="/master" element={<MasterDashboardPage />} />
            <Route path="/master/dashboard" element={<MasterDashboardPage />} />
            <Route path="/master/master" element={<MasterPage />} />
            <Route path="/master/tenants" element={<MasterTenantsPage />} />
            <Route path="/master/users" element={<MasterUsersPage />} />
            <Route path="/master/calls" element={<MasterCallsPage />} />
            <Route path="/master/analytics" element={<MasterAnalyticsPage />} />
            <Route path="/master/billing" element={<MasterBillingPage />} />
            <Route path="/master/telephony" element={<MasterTelephonyPage />} />
            <Route path="/master/compliance" element={<MasterCompliancePage />} />
            <Route path="/master/alerts" element={<MasterAlertsPage />} />
            <Route path="/master/support" element={<MasterSupportPage />} />
            <Route path="/master/settings" element={<MasterSettingsPage />} />
            <Route path="/master/portal-access" element={<MasterPortalAccessPage />} />
            <Route path="/master/module-access" element={<MasterModuleAccessPage />} />
            <Route path="/subscribe" element={<SubscribePage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="/support" element={<SupportPage />} />
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
