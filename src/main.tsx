import React, { Component, type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

class PortalErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Portal render failed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return <div className="min-h-screen bg-background p-8 text-foreground"><h1 className="text-xl font-semibold">Portal could not render</h1><p className="mt-2 text-sm text-muted-foreground">{this.state.error.message}</p></div>;
    }
    return this.props.children;
  }
}

const portalRoutes = [
  "/auth", "/dashboard", "/crm", "/dialer", "/team", "/whatsapp", "/reports",
  "/performance", "/audit", "/tools", "/pipeline", "/tasks", "/marketing", "/pbx",
  "/subscribe", "/payment", "/integration", "/recording", "/settings", "/master",
  "/whatsapp-templates", "/whatsapp-automation", "/broadcast", "/whatsapp-reports", "/whatsapp-settings",
  "/summary", "/disposition-report", "/productivity", "/game",
  "/productivity-attendance", "/automation", "/stages", "/form", "/products", "/webdialer",
  "/gopages", "/gopagesv2", "/web_form", "/voice-broadcast", "/survey-in", "/integrate_form", "/support",
];

const isPortalRoute =
  portalRoutes.some((route) => window.location.pathname === route || window.location.pathname.startsWith(`${route}/`)) ||
  (window.location.pathname === "/master" && Boolean(localStorage.getItem("ifox_token")));

const root = ReactDOM.createRoot(document.getElementById("root")!);

const isMasterRoute =
  window.location.pathname === "/master" || window.location.pathname.startsWith("/master/");

async function reportPortalError(event: ErrorEvent | PromiseRejectionEvent | { message?: string; stack?: string; source?: string }) {
  const errorMessage = event instanceof ErrorEvent ? event.message : (event as PromiseRejectionEvent).reason?.message || (event as { message?: string }).message || 'Unknown portal error';
  const errorStack = event instanceof ErrorEvent ? event.error?.stack || event.error?.message || event.message : (event as PromiseRejectionEvent).reason?.stack || (event as { stack?: string }).stack || '';
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('ifox_user') || 'null');
    } catch {
      return null;
    }
  })();

  try {
    await fetch('/api/error-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: errorMessage,
        stack: errorStack,
        source: (event as { source?: string }).source || 'portal',
        url: window.location.href,
        userEmail: storedUser?.email || '',
        userName: storedUser?.name || '',
      }),
    });
  } catch {
    // no-op: avoid recursive error loops during failure reporting
  }
}

window.addEventListener('error', (event) => {
  void reportPortalError(event);
});

window.addEventListener('unhandledrejection', (event) => {
  void reportPortalError({
    message: event.reason?.message || 'Unhandled promise rejection',
    stack: event.reason?.stack || '',
    source: 'unhandledrejection',
  });
});

if (isPortalRoute) {
  const renderPortal = async () => {
    if (isMasterRoute) await import("../website/src/styles.css");
    root.render(
      <React.StrictMode>
        <PortalErrorBoundary><App /></PortalErrorBoundary>
      </React.StrictMode>,
    );
  };
  void renderPortal();
} else {
  Promise.all([
    import("./website-app"),
    import("../website/src/styles.css"),
  ]).then(([{ default: WebsiteApp }]) => {
    root.render(
      <React.StrictMode>
        <WebsiteApp />
      </React.StrictMode>,
    );
  });
}
