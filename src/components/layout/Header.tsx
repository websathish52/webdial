import { useLocation, useNavigate } from "react-router-dom";
import { Phone, HelpCircle, Moon, Sun, RefreshCw, Menu, LogOut, Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCurrentMember, clearSession } from "@/lib/mock-store";
import api from "@/lib/api";
import { toast } from "sonner";

export default function Header({ onMenu, dark, onToggleDark }: { onMenu: () => void; dark: boolean; onToggleDark: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const member = useCurrentMember();
  const isAdmin = member?.role === "SuperAdmin" || member?.role === "Admin";
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const refreshNotifications = async () => {
    if (!member?.id) {
      setNotifications([]);
      return;
    }
    try {
      const data = await api.getNotifications();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    void refreshNotifications();
    const timer = window.setInterval(() => { void refreshNotifications(); }, 15000);
    return () => window.clearInterval(timer);
  }, [member?.id]);

  useEffect(() => {
    setShowNotifications(false);
  }, [pathname]);

  const unreadCount = notifications.filter((notification: any) => !notification.read).length;

  const handleNotificationClick = async (notification: any) => {
    try {
      if (!notification.read) {
        await api.markNotificationRead(notification._id || notification.id);
        setNotifications((current) => current.map((item: any) => item._id === notification._id || item.id === notification.id ? { ...item, read: true } : item));
      }
    } catch {}
    setShowNotifications(false);
    const taskId = notification.relatedTaskId || notification.relatedTask?._id;
    navigate(taskId ? `/tasks?taskId=${encodeURIComponent(String(taskId))}` : '/tasks');
  };

  const handleLogout = () => {
    clearSession();
    localStorage.removeItem('ifox_token');
    localStorage.removeItem('ifox_user');
    sessionStorage.removeItem('ifox_token');
    sessionStorage.removeItem('ifox_user');
    document.cookie = 'ifox_token=; Max-Age=0; path=/';
    document.cookie = 'ifox_user=; Max-Age=0; path=/';
    toast.success('Logged out successfully');
    navigate('/auth');
  };

  return (
    <header className="h-14 sm:h-16 bg-card border-b border-border px-3 sm:px-6 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button className="lg:hidden p-2 rounded-lg hover:bg-accent shrink-0" onClick={onMenu}><Menu className="size-5"/></button>
        <Phone className="hidden sm:block size-5 text-primary shrink-0" />
        <h1 className="font-semibold text-base sm:text-lg capitalize truncate">
          {pathname.replace("/","").replace("-"," ") || "Dashboard"}
        </h1>
        {isAdmin && <span className="hidden sm:inline text-[10px] bg-primary/15 text-primary px-2 py-0.5 rounded font-bold shrink-0">ADMIN</span>}
      </div>
      <div className="flex items-center gap-1 sm:gap-2 text-muted-foreground shrink-0 relative">
        <Button variant="ghost" className="hidden sm:inline-flex text-primary font-medium gap-1"><HelpCircle className="size-4" /> Help</Button>
        <Button variant="ghost" size="icon" onClick={onToggleDark}>{dark ? <Sun className="size-4"/> : <Moon className="size-4"/>}</Button>
        <Button variant="ghost" size="icon" onClick={() => location.reload()}><RefreshCw className="size-4" /></Button>
        <div className="relative">
          <Button variant="ghost" size="icon" onClick={() => setShowNotifications((value) => !value)} className="relative">
            <Bell className="size-4" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </Button>
          {showNotifications && (
            <div className="absolute right-0 top-12 z-50 w-80 max-h-[70vh] overflow-auto rounded-xl border bg-popover p-2 shadow-xl">
              <div className="mb-2 px-2 text-sm font-semibold text-foreground">Notifications</div>
              {notifications.length === 0 ? (
                <div className="px-2 py-4 text-sm text-muted-foreground">No new notifications</div>
              ) : notifications.map((notification: any) => (
                <button key={notification._id || notification.id} onClick={() => void handleNotificationClick(notification)} className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${notification.read ? 'bg-background/60' : 'bg-blue-50/70 dark:bg-blue-950/30'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-medium">{notification.title || 'Task assigned'}</div>
                      <div className="text-xs text-muted-foreground mt-1">{notification.message || 'A new task was assigned to you.'}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{notification.metadata?.companyName || notification.companyName || 'Company'} • {new Date(notification.createdAt || notification.updatedAt || Date.now()).toLocaleString()}</div>
                    </div>
                    {!notification.read && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout"><LogOut className="size-4" /></Button>
      </div>
    </header>
  );
}
