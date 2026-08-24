import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { store, useStore, setBackendSession, clearSession } from "@/lib/mock-store";
import api, { setSelectedCompanyId } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import webdialLogo from "@/assets/webdial-jpg.png";


function clearAllAuthAndTenantStorage() {
  localStorage.removeItem('ifox_token');
  localStorage.removeItem('ifox_user');
  localStorage.removeItem('ifox_selected_company');
  sessionStorage.removeItem('ifox_token');
  sessionStorage.removeItem('ifox_user');
  sessionStorage.removeItem('ifox_selected_company');
  document.cookie = 'ifox_token=; Max-Age=0; path=/';
  document.cookie = 'ifox_user=; Max-Age=0; path=/';



}

function AuthPage() {
  const nav = useNavigate();
  const session = useStore(s => s.session);
  const [user, setUser] = useState("admin@ifox.com");
  const [pw, setPw] = useState("admin");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Validate session on mount and before redirecting
  useEffect(() => {
    const validateSession = async () => {
      try {
        const token = localStorage.getItem('ifox_token') || sessionStorage.getItem('ifox_token');
        if (!token) {
          setLoading(false);
          setMounted(true);
          return;
        }

        // Try to validate token with backend
        const res = await api.me();
        if (res?.user) {
          // Token is valid, set session and redirect
          setBackendSession(res.user);
          nav('/dashboard');
        } else {
          // Token is invalid, clear and show login
          clearAllAuthAndTenantStorage();
          clearSession();
          setLoading(false);
          setMounted(true);
        }
      } catch (err) {
        // Token validation failed, show login
        clearAllAuthAndTenantStorage();
        clearSession();
        setLoading(false);
        setMounted(true);
      }
    };

    validateSession();
  }, [nav]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // CRITICAL: clear any stale session/tenant data from a previous user
    // BEFORE logging in, so no old company context leaks into this login.
    clearAllAuthAndTenantStorage();

    api.login(user.trim(), pw)
      .then((res: any) => {
        if (!res || !res.token) throw new Error('Invalid response');

        localStorage.setItem('ifox_token', res.token);
        localStorage.setItem('ifox_user', JSON.stringify(res.user));
        sessionStorage.setItem('ifox_token', res.token);
        sessionStorage.setItem('ifox_user', JSON.stringify(res.user));
        document.cookie = `ifox_token=${res.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = `ifox_user=${encodeURIComponent(JSON.stringify(res.user))}; path=/; max-age=${60 * 60 * 24 * 7}`;

        // Explicitly reset tenant context to THIS user's own company only.
        // For superadmin (role === 'master' managing one company) this ensures
        // the dashboard always starts scoped to their own companyId, never a
        // leftover selection from a previous session in this browser.
        setSelectedCompanyId(res.user?.companyId ? String(res.user.companyId) : null);

        setBackendSession(res.user);
        toast.success(`Welcome ${res.user.name}`);
        nav(res.user.role === 'master' ? '/master' : '/dashboard');
      })
      .catch((err: any) => {
        console.error(err);
        toast.error(err.message || 'Login failed');
        clearAllAuthAndTenantStorage();
        setLoading(false);
      });
  };

  if (!mounted || loading) return null;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)]">
      <div className="hidden lg:flex flex-col justify-center p-12 bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] text-white">
        <div className="max-w-md">
          <div className="flex items-center gap-3 mb-8">
            {/* <div className="size-14 rounded-2xl bg-white/20 backdrop-blur grid place-items-center"><Phone className="size-7"/></div> */}
            <img src={webdialLogo} alt="Web Dial Logo" className="h-14 w-auto  rounded-lg object-contain" />
            <div>
              <div className="text-3xl font-bold">Web Dial</div>
              <div className="text-sm opacity-80">CRM · Auto-Dialer · Analytics</div>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">Web-based calling made simple.</h1>
          <p className="opacity-90">Manage leads, dial one-by-one automatically, track dispositions and team performance — all in your browser.</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-4 sm:p-6 bg-white">
        <form onSubmit={submit} className="w-full max-w-sm bg-card border rounded-2xl p-6 sm:p-8 shadow-lg space-y-5">
          <div className="lg:hidden flex items-center gap-2 mb-2">
            <div className="size-10 rounded-xl bg-primary grid place-items-center text-primary-foreground"><Phone className="size-5"/></div>
            <div className="font-bold text-xl">Web Dial</div>
          </div>
          <div>
            <h2 className="text-2xl font-bold">Sign in</h2>
            <p className="text-sm text-muted-foreground">Enter your email and password to continue.</p>
          </div>
          <div><Label>Email or username</Label><Input value={user} onChange={e=>setUser(e.target.value)} required disabled={loading}/></div>
          <div><Label>Password</Label><Input type="password" value={pw} onChange={e=>setPw(e.target.value)} required disabled={loading}/></div>
          <Button type="submit" className="w-full bg-primary" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</Button>
              <Button  className="w-full bg-primary"><a href="/contact">Create account</a></Button>

          {/* <div className="text-xs text-muted-foreground bg-muted p-3 rounded-lg">
            <div className="font-semibold mb-1">Demo accounts</div>
            <div>SuperAdmin: <b>admin@ifox.com</b> / <b>admin</b></div>
          </div> */}
        </form>
      </div>
    </div>
  );
}

export default AuthPage;