import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";

type TrialPlan = "STARTED" | "PRO";

type TrialDialogProps = {
  plan?: TrialPlan;
  trigger: ReactNode;
};

function getDeviceIdentifier() {
  const existing = localStorage.getItem("webdial_trial_device");
  if (existing) return existing;
  const identifier = window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
  localStorage.setItem("webdial_trial_device", identifier);
  return identifier;
}

export function TrialDialog({ plan, trigger }: TrialDialogProps) {
  const [selectedPlan, setSelectedPlan] = useState<TrialPlan>(plan || "STARTED");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const startTrial = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    try {
      const configuredApiUrl = (import.meta.env["VITE_API_URL"] || "").replace(/\/$/, "");
      const trialUrl = configuredApiUrl.endsWith("/api")
        ? `${configuredApiUrl}/auth/trial`
        : `${configuredApiUrl}/api/auth/trial`;
      const response = await fetch(trialUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          companyName: form.get("companyName"),
          organisation: form.get("organisation"),
          phone: form.get("phone"),
          email: form.get("email"),
          password: form.get("password"),
          plan: selectedPlan,
          numberOfUsers: Number(form.get("numberOfUsers") || 1),
          deviceIdentifier: getDeviceIdentifier(),
        }),
      });
      const responseText = await response.text();
      let result: { message?: string; token?: string; user?: unknown } = {};
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error("The trial service is unavailable. Please try again in a moment.");
      }
      if (!response.ok) throw new Error(result.message || "Unable to start your trial");
      if (!result.token || !result.user) throw new Error("The trial service returned an invalid response.");
      localStorage.setItem("ifox_token", result.token);
      localStorage.setItem("ifox_user", JSON.stringify(result.user));
      sessionStorage.setItem("ifox_token", result.token);
      sessionStorage.setItem("ifox_user", JSON.stringify(result.user));
      document.cookie = `ifox_token=${result.token}; path=/; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `ifox_user=${encodeURIComponent(JSON.stringify(result.user))}; path=/; max-age=${60 * 60 * 24 * 7}`;
      localStorage.setItem("ifox_trial_onboarding_pending", "true");
      toast.success("Your 7-day free trial is active.");
      setOpen(false);
      window.location.href = "/dashboard";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to start your trial");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={() => plan && setSelectedPlan(plan)}>{trigger}</DialogTrigger>
      <DialogContent className="h-fit max-h-[calc(100dvh_-_2rem)] w-full max-w-[calc(100vw-2rem)] max-w-2xl overflow-y-auto rounded-xl p-5 sm:p-6">
        <DialogHeader className="text-center sm:text-left">
          <div className="mx-auto inline-flex w-fit items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary sm:mx-0">
            7 days free trial · no card required
          </div>
          <DialogTitle className="mt-2">Start your {selectedPlan === "PRO" ? "Pro" : "Started"} trial</DialogTitle>
          <DialogDescription>Full plan access for exactly 7 days. Create your WebDial account below.</DialogDescription>
        </DialogHeader>
        <form onSubmit={startTrial} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="trial-firstName">First name</Label><Input id="trial-firstName" name="firstName" required /></div>
          <div className="space-y-2"><Label htmlFor="trial-lastName">Last name</Label><Input id="trial-lastName" name="lastName" required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="trial-companyName">Company name</Label><Input id="trial-companyName" name="companyName" required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="trial-organisation">Organisation</Label><Input id="trial-organisation" name="organisation" /></div>
          <div className="space-y-2"><Label htmlFor="trial-phone">Contact number</Label><Input id="trial-phone" name="phone" type="tel" required /></div>
          <div className="space-y-2"><Label htmlFor="trial-numberOfUsers">Number of users</Label><Input id="trial-numberOfUsers" name="numberOfUsers" type="number" min={1} defaultValue={1} required /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="trial-email">Email</Label><Input id="trial-email" name="email" type="email" required /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="trial-password">Password</Label>
            <div className="relative">
              <Input
                id="trial-password"
                name="password"
                type={showPassword ? "text" : "password"}
                minLength={6}
                required
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 grid w-11 place-items-center text-muted-foreground transition-colors hover:text-foreground"
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <label className="flex items-start gap-2 text-sm sm:col-span-2"><Checkbox required /><span>I agree to the Terms &amp; Conditions.</span></label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2"><Checkbox required /><span>I agree to the Privacy Policy.</span></label>
          <Button type="submit" disabled={submitting} className="h-11 sm:col-span-2">{submitting ? "Activating..." : "Let's Go"}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
