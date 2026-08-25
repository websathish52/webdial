import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { useCurrentMember } from "@/lib/mock-store";

export default function AppLayout() {
  const member = useCurrentMember();
  const location = useLocation();
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { document.documentElement.classList.toggle("dark", dark); }, [dark]);
  useEffect(() => { setOpen(false); }, [location.pathname]);

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
    </div>
  );
}
