import { Link } from "react-router-dom";
import {
  PhoneCall, Users, MessageSquare, BarChart3, Workflow, ShieldCheck, ClipboardList,
  Wrench, Megaphone, Server, Mic, Puzzle, CalendarClock, UserCheck,
} from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";

const modules = [
  { icon: PhoneCall, t: "Auto Dialer", d: "Preview, progressive and click-to-call dialing with instant disposition capture and auto callbacks." },
  { icon: Users, t: "CRM", d: "Unlimited leads, custom fields, bulk import, duplicate control and smart list assignment." },
  { icon: MessageSquare, t: "WhatsApp", d: "Approved templates, bulk broadcast, per-lead chat history and post-call auto messages." },
  { icon: BarChart3, t: "Reports & Analytics", d: "Daily calls, connect rate, disposition mix and downloadable team reports." },
  { icon: UserCheck, t: "Performance", d: "Talk time, productivity score, attendance and leaderboard per agent." },
  { icon: ShieldCheck, t: "Audit Logs", d: "Every login, edit, export and delete recorded with user and timestamp." },
  { icon: Wrench, t: "Tools", d: "Number masking, DNC filters, bulk cleanup and lead deduplication utilities." },
  { icon: Workflow, t: "Pipeline", d: "Drag-and-drop deal stages with value tracking and conversion analytics." },
  { icon: ClipboardList, t: "Tasks", d: "Follow-up reminders, callback scheduling and daily to-do for each telecaller." },
  { icon: Megaphone, t: "Marketing", d: "SMS, email and WhatsApp campaigns targeted by disposition or pipeline stage." },
  { icon: Server, t: "Web PBX", d: "Browser softphone with SIP trunk support — no desk phone required." },
  { icon: Mic, t: "Call Recording", d: "Secure cloud recording with search, playback and quality scoring." },
  { icon: Puzzle, t: "Integrations", d: "Webhooks, REST API, Google Sheets, Zapier and website lead forms." },
  { icon: CalendarClock, t: "Shift & Attendance", d: "Login/logout tracking, break monitoring and shift-wise reporting." },
];

export default function Features() {
  return (
    <div className="page-light min-h-screen">
      <Header />
      <main>
        <section className="section-navy">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center">
            <h1 className="text-4xl font-bold sm:text-5xl">
              One platform. <span className="text-gradient">Every calling module.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              WebDial replaces your dialer, CRM, WhatsApp tool and reporting sheets with a single
              workspace built for telecalling teams.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {modules.map((m) => (
              <div key={m.t} className="glass-card rounded-2xl p-6 transition-transform hover:-translate-y-1">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary-glow">
                  <m.icon className="size-5" />
                </div>
                <h2 className="mt-5 text-lg font-semibold">{m.t}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{m.d}</p>
              </div>
            ))}
          </div>

          <div className="glass-card mt-14 rounded-3xl p-10 text-center">
            <h2 className="text-2xl font-bold">Want to see it on your data?</h2>
            <p className="mt-3 text-muted-foreground">We will run a live demo with your lead list.</p>
            <Button asChild variant="hero" size="lg" className="zoom-glow mt-6">
              <Link to="/contact">Start free trial</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
