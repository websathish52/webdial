import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useCurrentMember } from "@/lib/mock-store";
import webdialLogo from "@/assets/webdial-logo.png";

export default function AppLayout() {
  const member = useCurrentMember();
  const location = useLocation();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("ifox_theme") === "dark";
  });
  const [open, setOpen] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(1);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ifox_theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    const handleLoading = (event: Event) => {
      const detail = (event as CustomEvent<{ loading?: boolean; progress?: number }>).detail;
      setApiLoading(Boolean(detail?.loading));
      if (typeof detail?.progress === "number") setLoadingProgress(detail.progress);
    };
    window.addEventListener("ifox-api-loading", handleLoading);
    return () => window.removeEventListener("ifox-api-loading", handleLoading);
  }, []);

  if (!member) return <Navigate to="/auth" replace />;

  return (
    <div className="h-screen flex bg-muted/30">
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-sidebar-border bg-background">
        <Sidebar />
      </aside>
      
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)}/>
          <aside className="absolute left-0 top-0 h-screen w-72 border-r border-sidebar-border shadow-2xl">
            <Sidebar onClose={()=>setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 min-h-0 flex flex-col h-screen">
        <Header onMenu={()=>setOpen(true)} dark={dark} onToggleDark={()=>setDark(d=>!d)} />
        <div className="min-w-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
      {apiLoading && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="flex min-w-40 flex-col items-center gap-3 rounded-2xl border bg-card px-7 py-6 shadow-xl">
            <div className="relative size-28" aria-label={`Loading ${loadingProgress}%`}>
              <svg className="size-full -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="7" className="text-primary/15" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="7"
                  strokeLinecap="round"
                  className="text-primary transition-[stroke-dashoffset] duration-150"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={(2 * Math.PI * 52) * (1 - loadingProgress / 100)}
                />
              </svg>
              <div className="absolute inset-3 grid place-items-center rounded-full bg-background p-3">
                <img src={webdialLogo} alt="WebDial" className="size-full rounded-full object-contain" />
              </div>
            </div>
            <div className="text-sm font-semibold text-foreground">Loading {loadingProgress}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
