import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useCurrentMember } from "@/lib/mock-store";

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
          <aside className="absolute left-0 top-0 h-full w-72 border-r border-sidebar-border shadow-2xl">
            <Sidebar onClose={()=>setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <Header onMenu={()=>setOpen(true)} dark={dark} onToggleDark={()=>setDark(d=>!d)} />
        <div className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-3 sm:p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
      {apiLoading && (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm" role="status" aria-live="polite">
          <div className="flex min-w-32 flex-col items-center gap-3 rounded-2xl border bg-card px-6 py-5 shadow-xl">
            <div className="size-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
            <div className="text-sm font-semibold text-foreground">Loading {loadingProgress}%</div>
          </div>
        </div>
      )}
    </div>
  );
}
