import { Link } from "react-router-dom";
import {
  PhoneCall,
  Users,
  BarChart3,
  MessageSquare,
  Workflow,
  ShieldCheck,
  Headphones,
  Rocket,
  CheckCircle2,
  Mic,
  LayoutDashboard,
} from "lucide-react";
import heroImg from "../assets/1.jpg";
import telecallerImg from "../assets/6.png";
import teamImg from "../assets/team-callcenter.jpg";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { ClientLogos } from "@/components/site/ClientLogos";
import { Testimonials } from "@/components/site/Testimonials";
import { Faq } from "@/components/site/Faq";
import { DataSafe } from "@/components/site/DataSafe";
import { ContactStrip } from "@/components/site/ContactStrip";
import { Button } from "@/components/ui/button";

const homepagePlans = [
  { name: "Starter", price: "₹199", tag: "per agent / month", desc: "For small teams getting off spreadsheets.", features: ["Up to 5 agents", "Auto dialer", "Lead CRM", "Basic reports", "Email support"], highlight: false },
  { name: "Pro", price: "₹499", tag: "per agent / month", desc: "For scaling telecalling operations.", features: ["Unlimited agents", "WhatsApp suite", "Pipeline & tasks", "Call recording", "Performance & attendance", "Priority support"], highlight: true },
];

const stats = [
  { value: "50+", label: "Calls dialed" },
  { value: "10+", label: "Active agents" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "38%", label: "Avg. talk-time lift" },
];

const heroPoints = [
  { icon: PhoneCall, text: "Auto Dial Directly From Your Browser" },
  { icon: Mic, text: "Call Recording & Real-Time Analytics" },
  { icon: Users, text: "Powerful Web CRM & Lead Management" },
  { icon: Workflow, text: "Sync Leads From 100+ Integrations" },
  { icon: MessageSquare, text: "Official WhatsApp Inbox & Broadcast" },
  { icon: LayoutDashboard, text: "One Dashboard. Your Entire Call Center" },
];

const features = [
  {
    icon: PhoneCall,
    title: "Auto Dialer",
    text: "Progressive and preview dialing with dispositions, callbacks and one-tap redial.",
  },
  {
    icon: Users,
    title: "Telecaller CRM",
    text: "Lead lists, pipeline stages, notes and follow-ups built for calling teams.",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Suite",
    text: "Templates, bulk broadcast and instant follow-ups right after the call ends.",
  },
  {
    icon: BarChart3,
    title: "Live Analytics",
    text: "Daily calls, talk time, productivity and attendance tracked in real time.",
  },
  {
    icon: Workflow,
    title: "Pipeline & Tasks",
    text: "Move deals across stages, assign tasks and never lose a hot lead again.",
  },
  {
    icon: ShieldCheck,
    title: "Audit & Recording",
    text: "Call recordings, audit logs and role-based access for full accountability.",
  },
];

const steps = [
  { n: "01", t: "Upload leads", d: "Import CSV or sync from your CRM in seconds." },
  { n: "02", t: "Assign teams", d: "Distribute lists to telecallers with smart rules." },
  { n: "03", t: "Start dialing", d: "Agents call from the app — every outcome logged." },
  { n: "04", t: "Measure & scale", d: "Track productivity live and coach with recordings." },
];

export default function Home() {
  return (
    <div className="page-light min-h-screen">
      <Header />

      <main>
        {/* Hero — navy banner */}
        <section className="section-navy relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:py-12">
            <Reveal direction="left">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-glow">
                <Rocket className="size-3.5" /> Built for outbound sales teams
              </span>
              <h1 className="mt-6 text-4xl leading-tight font-bold sm:text-5xl lg:text-6xl">
                Your Call Center
                <span className="text-gradient"> In Your Pocket</span>
              </h1>
              <p className="mt-2 max-w-xl text-lg text-muted-foreground">
                Built for outbound sales teams that need speed, visibility and follow-up without the chaos.
              </p>

              <div className="mt-6 grid max-w-xl gap-3 sm:grid-cols-2">
                {heroPoints.map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-start gap-2 rounded-lg border border-[#083ACD]/10 bg-[#F3F7FF] px-3 py-2 text-sm text-[#050505] shadow-sm"
                  >
                    <span className="hero-point-icon mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md shadow-sm">
                      <Icon className="size-3.5" />
                    </span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  variant="hero"
                  size="lg"
                  className="zoom-glow transition-all duration-300 hover:scale-[1.04]"
                >
                  <Link to="/contact">Start free trial</Link>
                </Button>
                <Button
                  asChild
                  variant="outlineGlow"
                  size="lg"
                  className="transition-transform duration-300 hover:scale-[1.02]"
                >
                  <Link to="/master" className="rounded-sm " style={{"backgroundColor": "#050505", "color": "#fff"}}>
                    See Master Console
                  </Link>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-medium text-primary-glow">
                  7-day free trial · no card required
                </span>
                {[
                  "No hardware needed",
                  "Setup in 10 minutes",
                  "Cancel anytime",
                ].map((i) => (
                  <span key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-success" /> {i}
                  </span>
                ))}
              </div>
            </Reveal>

            <Reveal direction="right" delay={120}>
              <div className="glass-card glow-ring overflow-hidden rounded-2xl">
                <img
                  src={heroImg}
                  alt="WebDial cloud calling dashboard with live analytics"
                  width={1408}
                  height={1008}
                  className="w-full"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-border bg-surface">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 80} direction="zoom">
                <div className="stats-card text-center" style={{ animationDelay: `${i * 120}ms` }}>
                  <div className="counter-gradient font-display text-3xl font-bold sm:text-4xl">{s.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Client logos — light band */}

        {/* Features */}
        <section className="mx-auto max-w-7xl px-5 py-20">
          <Reveal>
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold sm:text-4xl">Everything your calling team needs</h2>
              <p className="mt-4 text-muted-foreground">
                One workspace for admins, supervisors and telecallers — no spreadsheets, no guesswork.
              </p>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 70}>
                <div className="glass-card h-full rounded-2xl p-6 transition-transform hover:-translate-y-1">
                  <div className="feature-icon flex size-11 items-center justify-center rounded-xl shadow-sm">
                    <f.icon className="size-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Telecaller dashboard showcase — light band */}
        <section className="bg-surface py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2">
            <Reveal direction="left">
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <img
                  src={telecallerImg}
                  alt="WebDial telecaller dashboard showing KPIs, dispositions and daily call chart"
                  width={1600}
                  height={900}
                  loading="lazy"
                  className="w-full"
                />
              </div>
            </Reveal>
            <Reveal direction="right" delay={100}>
              <h2 className="text-3xl font-bold sm:text-4xl">The telecaller dashboard</h2>
              <p className="mt-4 text-muted-foreground">
                Agents log in and see exactly what to do next — today's calls, assigned leads,
                dispositions and their own scorecard. No training manual needed.
              </p>
              <ul className="mt-8 space-y-3 text-sm">
                {[
                  "One-click dialing with auto disposition prompts",
                  "Callback reminders and task list for the day",
                  "Personal productivity, talk time and attendance",
                  "WhatsApp follow-up right after the call ends",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" /> {p}
                  </li>
                ))}
              </ul>
              <Button asChild variant="hero" size="lg" className="mt-8">
                <Link to="/features">Explore all modules</Link>
              </Button>
            </Reveal>
          </div>
        </section>

        {/* Roles */}
        <section className="py-20">
          <div className="mx-auto grid max-w-7xl gap-6 px-5 lg:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                role: "Super Admin",
                points: ["All teams overview", "Agent & license control", "Audit logs, billing"],
              },
              {
                icon: Users,
                role: "Team Admin",
                points: ["Lead distribution", "Dispositions & pipeline", "Team performance"],
              },
              {
                icon: Headphones,
                role: "Telecaller",
                points: ["One-click dialing", "Callback reminders", "Own daily scorecard"],
              },
            ].map((r, i) => (
              <Reveal key={r.role} delay={i * 90} direction="up">
                <div className="h-full rounded-2xl border border-border glass-card bg-card p-7 shadow-sm transition-transform hover:-translate-y-1">
                  <r.icon className="size-6 text-primary" />
                  <h3 className="mt-4 text-xl font-semibold">{r.role}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    {r.points.map((p) => (
                      <li key={p} className="flex items-center gap-2">
                        <CheckCircle2 className="size-4" /> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        </section>



 <section className="bg-surface py-20">
          <div className="mx-auto max-w-7xl px-5">
            <Reveal>
              <div className="mx-auto max-w-3xl text-center">
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary-glow">
                  7 days free trial included
                </span>
                <h2 className="mt-6 text-3xl font-bold sm:text-4xl">
                  Pricing that scales <span className="text-gradient">with your team</span>
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
                  Pay per active agent. Every plan includes the dialer, CRM and live analytics.
                </p>
              </div>
            </Reveal>
            <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
              {homepagePlans.map((plan, index) => (
                <Reveal key={plan.name} delay={index * 100}>
                  <div className={plan.highlight ? " glow-ring relative rounded-2xl border-primary/60 p-8 border-2 border-[#2f70ec]" : " rounded-2xl p-8"} style={{backgroundColor:"#fff"}}>
                    {plan.highlight && <span className="absolute -top-3 left-8 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-xs font-semibold text-primary-foreground">Most popular</span>}
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.desc}</p>
                    <div className="mt-6 font-display text-4xl font-bold">{plan.price}</div>
                    <p className="text-xs text-muted-foreground">{plan.tag}</p>
                    <ul className="mt-6 space-y-3 text-sm">
                      {plan.features.map((feature) => <li key={feature} className="flex items-center gap-2"><CheckCircle2 className="size-4 text-success" />{feature}</li>)}
                    </ul>
                    <Button asChild variant={plan.highlight ? "hero" : "outlineGlow"} className="zoom-glow mt-8 w-full border-2 border-[#2f70ec] rounded-sm"><Link to="/contact">Start free trial</Link></Button>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>




        {/* How it works */}
        <section className="mx-auto max-w-7xl px-5 pb-22 pt-12">
          <Reveal>
            <h2 className="text-3xl font-bold sm:text-4xl mb-3">Live in four steps</h2>
            <p>Set up your WebDial account, connect your calling workflow, import your leads, and start dialing. Manage your team,<br /> track calls, and turn conversations into conversions — all from one powerful web dashboard.</p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div className="h-full rounded-2xl border border-border/70 p-6 glass-card">
                  <div className="font-display text-4xl font-bold text-primary/50">{s.n}</div>
                  <h3 className="mt-3 font-semibold">{s.t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Inside the operation */}
        <section className="border-y border-border bg-surface py-20">
          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2">
            <Reveal direction="left">
              <h2 className="text-3xl font-bold sm:text-4xl">Built with calling floors, not for them</h2>
              <p className="mt-4 text-muted-foreground">
                Every screen in WebDial came from watching real telecalling floors — admissions desks,
                loan teams, real estate pre-sales. Fewer clicks per call, more conversations per hour.
              </p>
              <div className="mt-8 grid grid-cols-2 gap-6">
                {[
                  { v: "3.2x", l: "More connected calls per agent" },
                  { v: "< 1 day", l: "Average go-live time" },
                ].map((m) => (
                  <div key={m.l}>
                    <div className="font-display text-3xl font-bold text-gradient">{m.v}</div>
                    <p className="mt-1 text-sm text-muted-foreground">{m.l}</p>
                  </div>
                ))}
              </div>
            </Reveal>
            <Reveal direction="right" delay={100}>
              <div className="glass-card glow-ring overflow-hidden rounded-2xl">
                <img
                  src={teamImg}
                  alt="Telecalling team using WebDial on a live calling floor"
                  width={1600}
                  height={1000}
                  loading="lazy"
                  className="w-full"
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* Your Data Is Safe */}
        <DataSafe />

                <ClientLogos />


        {/* Testimonials — blue band */}
        <Testimonials />

        {/* FAQ — light band */}
        <Faq />

       

        {/* CTA — navy band */}
              <ContactStrip />


          <section className="section-navy pb-20 ">
          <Reveal direction="zoom">
            <div className="card-light mx-auto max-w-5xl rounded-3xl  px-8 py-12 text-center">
              <h2 className="text-3xl font-bold sm:text-4xl">Ready to dial smarter?</h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                Give your telecallers a system they actually enjoy using — and give yourself the
                numbers you need.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  asChild
                  variant="hero"
                  size="lg"
                  className="zoom-glow transition-all duration-300 hover:scale-[1.04]"
                >
                  <Link to="/contact">Start free trial</Link>
                </Button>
                <Button asChild variant="outlineGlow" size="lg">
                  <Link to="/pricing" className="rounded-sm " style={{"backgroundColor": "#050505", "color": "#fff"}}>
                    View pricing
                  </Link>
                </Button>
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <Footer />
    </div>
  );
}
