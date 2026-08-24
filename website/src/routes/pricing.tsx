import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const plans = [
  {
    name: "Starter",
    price: "₹199",
    tag: "per agent / month",
    desc: "For small teams getting off spreadsheets.",
    features: ["Up to 5 agents", "Auto dialer", "Lead CRM", "Basic reports", "Email support"],
    highlight: false,
  },
  {
    name: "Pro",
    price: "₹499",
    tag: "per agent / month",
    desc: "For scaling telecalling operations.",
    features: [
      "Unlimited agents",
      "WhatsApp suite",
      "Pipeline & tasks",
      "Call recording",
      "Performance & attendance",
      "Priority support",
    ],
    highlight: true,
  },
];

const faqs = [
  { q: "Is there a free trial?", a: "Yes — 7 days full access, no card required." },
  { q: "Do I need any hardware?", a: "No. WebDial runs in the browser and on Android; SIM or SIP both work." },
  { q: "Can I change plans later?", a: "Yes, upgrade or downgrade anytime and we prorate the difference." },
  { q: "Are call recordings included?", a: "Recordings are included from the Pro plan with 90-day storage." },
];

export default function Pricing() {
  return (
    <div className="page-light min-h-screen">
      <Header />
      <main>
        <section className="section-navy">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center">
            <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-sm font-medium text-primary-glow">
              7 days free trial included
            </span>
            <h1 className="mt-6 text-4xl font-bold sm:text-5xl">
              Pricing that scales <span className="text-gradient">with your team</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
              Pay per active agent. Every plan includes the dialer, CRM and live analytics.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20">
          <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
            {plans.map((p) => (
              <div
                key={p.name}
                className={
                  p.highlight
                    ? "glass-card glow-ring relative rounded-2xl border-primary/60 p-8"
                    : "glass-card rounded-2xl p-8"
                }
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-8 rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </span>
                )}
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-6 font-display text-4xl font-bold">{p.price}</div>
                <div className="text-xs text-muted-foreground">{p.tag}</div>
                <ul className="mt-6 space-y-3 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-muted-foreground">
                      <Check className="size-4 text-success" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant={p.highlight ? "hero" : "outlineGlow"} className="zoom-glow mt-8 w-full">
                  <Link to="/contact">Start free trial</Link>
                </Button>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-20 max-w-3xl">
            <h2 className="text-2xl font-bold">Frequently asked questions</h2>
            <Accordion type="single" collapsible className="mt-6">
              {faqs.map((f) => (
                <AccordionItem key={f.q} value={f.q}>
                  <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
