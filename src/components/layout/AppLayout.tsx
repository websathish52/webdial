import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import TrialOnboardingDialog from "./TrialOnboardingDialog";
import { clearSession, setBackendSession, useCurrentMember } from "@/lib/mock-store";
import api from "@/lib/api";
import webdialLogo from "@/assets/icon.png";
import { Button } from "@/components/ui/button";

export default function AppLayout() {
  const member = useCurrentMember();
  const [sessionReady, setSessionReady] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("ifox_theme") === "dark";
  });
  const [open, setOpen] = useState(false);
  const [apiLoading, setApiLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(1);
  const [navigationLoading, setNavigationLoading] = useState(false);
  const [storageFullMessage, setStorageFullMessage] = useState("");
  const [subscriptionExpired, setSubscriptionExpired] = useState(false);
  const [trialLimitReached, setTrialLimitReached] = useState(false);
  const [subscription, setSubscription] = useState<any>(null);
  const [showTrialOnboarding, setShowTrialOnboarding] = useState(false);
  const [purchaseSnoozeVersion, setPurchaseSnoozeVersion] = useState(0);
  const navigationTimerRef = useRef<number | null>(null);
  const navigationHideTimerRef = useRef<number | null>(null);
  const purchaseSnoozeKey = member ? `ifox_subscription_purchase_snooze_${member.id}` : "";
  const purchaseReasonKey = member ? `ifox_subscription_purchase_reason_${member.id}` : "";
  const isPurchaseSnoozed = () => {
    if (!purchaseSnoozeKey) return false;
    const snoozeUntil = Number(localStorage.getItem(purchaseSnoozeKey) || 0);
    if (snoozeUntil > Date.now()) return true;
    localStorage.removeItem(purchaseSnoozeKey);
    localStorage.removeItem(purchaseReasonKey);
    return false;
  };
  const snoozeSubscriptionPopup = (reason: "expired" | "trial", plan: string, price: number) => {
    localStorage.setItem(purchaseSnoozeKey, String(Date.now() + 10 * 60 * 1000));
    localStorage.setItem(purchaseReasonKey, reason);
    setPurchaseSnoozeVersion((version) => version + 1);
    setSubscriptionExpired(false);
    setTrialLimitReached(false);
    navigate(`/payment?plan=${plan}&price=${price}`);
  };

  useEffect(() => {
    if (member) {
      setSessionReady(true);
      return;
    }

    const token = localStorage.getItem("ifox_token") || sessionStorage.getItem("ifox_token");
    if (!token) {
      setSessionReady(true);
      return;
    }

    let active = true;
    void api.me().then((response) => {
      if (active && response?.user) setBackendSession(response.user);
    }).catch(() => {
      if (active) clearSession();
    }).finally(() => {
      if (active) setSessionReady(true);
    });

    return () => { active = false; };
  }, [member]);

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
  useEffect(() => {
    const handleExpired = () => { if (!isPurchaseSnoozed()) setSubscriptionExpired(true); };
    const handleTrialLimit = () => { if (!isPurchaseSnoozed()) setTrialLimitReached(true); };
    window.addEventListener("ifox-subscription-expired", handleExpired);
    window.addEventListener("ifox-trial-limit-reached", handleTrialLimit);
    if (member && member.role !== "Master") {
      void api.getCurrentSubscription().then((value) => {
        setSubscription(value);
        const isPaid = String(value?.type || "").toUpperCase() === "PAID" && value?.status === "ACTIVE";
        const isSuspended = value?.status === "SUSPENDED" || value?.status === "EXPIRED";
        const isExpired = value && value.type !== "MANUAL" && value.expiryDate && new Date(value.expiryDate) <= new Date();
        if (isPaid) {
          localStorage.removeItem(purchaseSnoozeKey);
          localStorage.removeItem(purchaseReasonKey);
        } else if ((isSuspended || isExpired) && !isPurchaseSnoozed()) {
          setSubscriptionExpired(true);
        }
      }).catch(() => undefined);
    }
    return () => {
      window.removeEventListener("ifox-subscription-expired", handleExpired);
      window.removeEventListener("ifox-trial-limit-reached", handleTrialLimit);
    };
  }, [member]);
  useEffect(() => {
    if (!member || member.role === "Master" || !purchaseSnoozeKey) return;
    const snoozeUntil = Number(localStorage.getItem(purchaseSnoozeKey) || 0);
    if (snoozeUntil <= Date.now()) return;
    const timer = window.setTimeout(() => {
      void api.getCurrentSubscription().then((value) => {
        setSubscription(value);
        const isPaid = String(value?.type || "").toUpperCase() === "PAID" && value?.status === "ACTIVE";
        if (isPaid) {
          localStorage.removeItem(purchaseSnoozeKey);
          localStorage.removeItem(purchaseReasonKey);
          setSubscriptionExpired(false);
          setTrialLimitReached(false);
          return;
        }
        const reason = localStorage.getItem(purchaseReasonKey);
        if (reason === "trial") setTrialLimitReached(true);
        else setSubscriptionExpired(true);
        localStorage.removeItem(purchaseSnoozeKey);
        localStorage.removeItem(purchaseReasonKey);
      }).catch(() => {
        setSubscriptionExpired(localStorage.getItem(purchaseReasonKey) !== "trial");
        setTrialLimitReached(localStorage.getItem(purchaseReasonKey) === "trial");
      });
    }, snoozeUntil - Date.now());
    return () => window.clearTimeout(timer);
  }, [member, purchaseSnoozeKey, purchaseReasonKey, purchaseSnoozeVersion]);
  useEffect(() => {
    if (!member || member.role === "Master") return;
    const isBlocked = subscriptionExpired || trialLimitReached;
    if (isBlocked && location.pathname !== "/payment") {
      navigate("/payment", { replace: true });
    }
  }, [member, location.pathname, navigate, subscriptionExpired, trialLimitReached]);
  useEffect(() => {
    if (!member || member.role === "Master") return;
    const onboardingKey = `ifox_trial_onboarding_completed_${member.id}`;
    if (localStorage.getItem("ifox_trial_onboarding_pending") === "true" && !localStorage.getItem(onboardingKey)) {
      setShowTrialOnboarding(true);
    }
  }, [member]);
  useEffect(() => {
    const handleStorageFull = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setStorageFullMessage(detail?.message || "Storage limit reached. Delete files or upgrade storage.");
    };
    window.addEventListener("ifox-storage-full", handleStorageFull);
    return () => window.removeEventListener("ifox-storage-full", handleStorageFull);
  }, []);
  useEffect(() => {
    const handleNavigationLoading = () => {
      if (navigationHideTimerRef.current) window.clearTimeout(navigationHideTimerRef.current);
      if (navigationTimerRef.current) window.clearInterval(navigationTimerRef.current);
      setNavigationLoading(true);
      setLoadingProgress(8);
      navigationTimerRef.current = window.setInterval(() => {
        setLoadingProgress((progress) => progress < 92 ? Math.min(92, progress + Math.max(1, Math.round((92 - progress) * 0.12))) : progress);
      }, 100);
      navigationHideTimerRef.current = window.setTimeout(() => {
        setLoadingProgress(100);
        setNavigationLoading(false);
        navigationHideTimerRef.current = null;
      }, 1500);
    };
    window.addEventListener("ifox-navigation-loading", handleNavigationLoading);
    return () => {
      window.removeEventListener("ifox-navigation-loading", handleNavigationLoading);
      if (navigationTimerRef.current) window.clearInterval(navigationTimerRef.current);
      if (navigationHideTimerRef.current) window.clearTimeout(navigationHideTimerRef.current);
    };
  }, []);
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ifox-navigation-loading"));
  }, [location.pathname]);

  if (!sessionReady) return <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">Loading session...</div>;
  if (!member) return <Navigate to="/auth" replace />;
  const isMasterDashboard = location.pathname.startsWith("/master");

  return (
    <div className={`flex h-screen w-full overflow-hidden bg-muted/30 ${isMasterDashboard ? "master-dashboard" : ""}`}>
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-background lg:flex">
        <Sidebar />
      </aside>
      
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setOpen(false)}/>
          <aside className="absolute left-0 top-0 h-screen w-[min(18rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] border-r border-sidebar-border bg-background shadow-2xl">
            <Sidebar onClose={()=>setOpen(false)} />
          </aside>
        </div>
      )}

      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenu={()=>setOpen(true)} dark={dark} onToggleDark={()=>setDark(d=>!d)} />
        {subscription && subscription.type !== "MANUAL" && (
          <div className={`flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-xs sm:px-6 ${subscriptionExpired ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}>
            <span><strong>{subscription.plan}</strong> · {subscriptionExpired ? "Subscription expired" : `${Math.max(0, Math.ceil((new Date(subscription.expiryDate).getTime() - Date.now()) / 86400000))} days remaining`}</span>
            <button type="button" className="font-semibold underline" onClick={() => navigate("/payment")}>{subscriptionExpired ? "Purchase to continue" : "View subscription"}</button>
          </div>
        )}
        <div className="min-w-0 min-h-0 flex-1 overflow-x-hidden overflow-y-auto ">
          <Outlet />
        </div>
      </main>
      {(apiLoading || navigationLoading) && (
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
      {storageFullMessage && (
        <div className="fixed inset-0 z-[110] grid place-items-center bg-black/40 p-4" role="alertdialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl border-2 border-red-500 bg-card p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 grid size-14 place-items-center rounded-full bg-red-100 text-2xl text-red-600">!</div>
            <h2 className="text-lg font-bold text-foreground">Storage limit reached</h2>
            <p className="mt-2 text-sm text-muted-foreground">{storageFullMessage}</p>
            <button className="mt-5 rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white" onClick={() => setStorageFullMessage("")}>Close</button>
          </div>
        </div>
      )}
      {(subscriptionExpired || trialLimitReached) && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby="subscription-expired-title">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 text-center shadow-2xl sm:p-8">
            <div className="mx-auto mb-4 inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">{trialLimitReached ? "Trial completed" : "Subscription paused"}</div>
            <h2 id="subscription-expired-title" className="text-2xl font-bold">{trialLimitReached ? "Your 7-day trial limit is complete" : "Your WebDial access is paused"}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {trialLimitReached
                ? "Your trial includes 200 total calls and 30 calls per telecaller per day. Upgrade to continue calling."
                : "Your account is suspended or expired. Choose Started or Pro to restore portal access and unlock calling again."}
            </p>
            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-900">
              <div className="font-semibold">Trial limits</div>
              <div className="mt-1">Up to 200 calls total in 7 days</div>
              <div>30 calls per telecaller per day</div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><Button onClick={() => snoozeSubscriptionPopup(trialLimitReached ? "trial" : "expired", "Starter", 199)}>Started · ₹199/user/month</Button><Button variant="outline" onClick={() => snoozeSubscriptionPopup(trialLimitReached ? "trial" : "expired", "Pro", 499)}>Pro · ₹499/user/month</Button></div>
          </div>
        </div>
      )}
      <TrialOnboardingDialog
        open={showTrialOnboarding}
        memberName={member.name}
        plan={subscription?.plan}
        onComplete={() => {
          localStorage.removeItem("ifox_trial_onboarding_pending");
          localStorage.setItem(`ifox_trial_onboarding_completed_${member.id}`, "true");
          setShowTrialOnboarding(false);
        }}
      />
    </div>
  );
}
