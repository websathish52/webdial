import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  MapPin,
  PhoneCall,
  Settings2,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type TrialOnboardingDialogProps = {
  open: boolean;
  memberName?: string;
  plan?: string;
  onComplete: () => void;
};

type Step = {
  label: string;
  title: string;
  description: string;
  icon: typeof Sparkles;
  bullets: string[];
};

const steps: Step[] = [
  {
    label: "Welcome",
    title: "Welcome to Web Dial",
    description: "Your 7-day free trial is active. Let us get your calling workspace ready.",
    icon: Sparkles,
    bullets: ["Verify your account to activate up to 200 calls total in 7 days during trial", "Each telecaller is restricted to 30 calls a day during trial", "Your trial ends after 7 days"],
  },
  {
    label: "Countries",
    title: "Where are you calling?",
    description: "Choose the countries your team will call from and call to.",
    icon: MapPin,
    bullets: ["Set your calling region", "Keep your team settings organized", "You can change this later in Settings"],
  },
  {
    label: "Choose Setup",
    title: "Choose your calling setup",
    description: "Start with the option that best matches your team.",
    icon: Settings2,
    bullets: ["SIM-based calling for mobile teams", "Cloud calling for browser-based teams", "Connect a provider later from PBX Settings"],
  },
  {
    label: "Add Contact",
    title: "Add your first contact",
    description: "Create a test contact or import your leads from Excel or CSV.",
    icon: UserPlus,
    bullets: ["Create lists in CRM", "Assign contacts to team members", "Import bulk contacts whenever you are ready"],
  },
  {
    label: "First Call",
    title: "Make your first call",
    description: "Open the Dialer, select a contact, and start calling your team’s way.",
    icon: PhoneCall,
    bullets: ["Review the contact before calling", "Set a disposition after every call", "Track performance from Reports"],
  },
];

export default function TrialOnboardingDialog({ open, memberName, plan, onComplete }: TrialOnboardingDialogProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const StepIcon = step.icon;
  const isLastStep = stepIndex === steps.length - 1;

  const finish = () => {
    setStepIndex(0);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) finish(); }}>
      <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-3xl overflow-hidden rounded-2xl border-0 bg-background p-0 shadow-2xl">
        <div className="border-b bg-primary px-5 py-5 text-primary-foreground sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground/75">Your first steps</p>
              <p className="mt-1 text-sm text-primary-foreground/90">{plan || "Trial"} plan · 7 days free</p>
            </div>
            <div className="grid size-11 shrink-0 place-items-center rounded-full bg-white/15"><StepIcon className="size-5" /></div>
          </div>
          <div className="mt-6 flex items-center gap-1.5 sm:gap-2" aria-label={`Onboarding step ${stepIndex + 1} of ${steps.length}`}>
            {steps.map((item, index) => (
              <div key={item.label} className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
                <div className={cn("grid size-7 shrink-0 place-items-center rounded-full border text-xs font-bold", index <= stepIndex ? "border-white bg-white text-primary" : "border-white/40 text-white/75")}>
                  {index < stepIndex ? <Check className="size-3.5" /> : index + 1}
                </div>
                <span className={cn("hidden truncate text-xs font-medium sm:block", index <= stepIndex ? "text-white" : "text-white/60")}>{item.label}</span>
                {index < steps.length - 1 && <div className={cn("h-px min-w-2 flex-1", index < stepIndex ? "bg-white" : "bg-white/25")} />}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-[0.85fr_1.15fr] sm:p-8">
          <div className="flex flex-col justify-center rounded-xl bg-blue-50 p-5 dark:bg-blue-950/30">
            <div className="mb-5 grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg"><StepIcon className="size-7" /></div>
            <p className="text-sm font-semibold text-primary">Step {stepIndex + 1} of {steps.length}</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">{step.title}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{step.description}</p>
          </div>

          <div className="flex flex-col justify-center">
            <DialogHeader className="text-left">
              <DialogTitle className="text-xl">{memberName ? `Hey ${memberName}!` : "Let’s get started"}</DialogTitle>
              <DialogDescription className="pt-1">A quick tour will help you get value from Web Dial right away.</DialogDescription>
            </DialogHeader>
            <div className="mt-6 space-y-3">
              {step.bullets.map((bullet) => (
                <div key={bullet} className="flex items-start gap-3 rounded-lg border bg-card p-3 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/30 px-5 py-4 sm:px-8">
          <Button type="button" variant="ghost" onClick={() => setStepIndex((value) => Math.max(0, value - 1))} disabled={stepIndex === 0}>
            <ArrowLeft /> Back
          </Button>
          {isLastStep ? (
            <Button type="button" onClick={finish}>Finish Setup <CheckCircle2 /></Button>
          ) : (
            <Button type="button" onClick={() => setStepIndex((value) => value + 1)}>Continue <ArrowRight /></Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
