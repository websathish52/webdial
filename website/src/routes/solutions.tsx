import { Link } from "react-router-dom";
import { GraduationCap, Building2, HeartPulse, Landmark, ShoppingBag, Truck, CheckCircle2 } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Button } from "@/components/ui/button";

const industries = [
  { icon: GraduationCap, t: "Education", d: "Admission counselling, enquiry follow-ups and batch reminders.", pts: ["Enquiry to admission funnel", "Counsellor scorecards", "Parent WhatsApp updates"] },
  { icon: Building2, t: "Real Estate", d: "Site-visit booking, broker coordination and buyer nurturing.", pts: ["Project-wise lead lists", "Visit scheduling", "Deal pipeline value"] },
  { icon: HeartPulse, t: "Healthcare", d: "Appointment confirmations, reports follow-up and patient recall.", pts: ["Appointment reminders", "Recall campaigns", "Consent-safe recording"] },
  { icon: Landmark, t: "BFSI & Collections", d: "Loan, insurance and recovery calling with strict audit trails.", pts: ["DNC compliance", "Full audit logs", "Promise-to-pay tracking"] },
  { icon: ShoppingBag, t: "E-commerce", d: "COD confirmation, abandoned cart recovery and repeat orders.", pts: ["Order sync via API", "Bulk WhatsApp", "RTO reduction"] },
  { icon: Truck, t: "Logistics", d: "Delivery coordination, driver dispatch and customer updates.", pts: ["Route-wise teams", "Instant call blast", "Live agent status"] },
];

export default function Solutions() {
  return (
    <div className="page-light min-h-screen">
      <Header />
      <main>
        <section className="section-navy">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center">
            <h1 className="text-4xl font-bold sm:text-5xl">
              Built for the way <span className="text-gradient">your industry calls</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
              Ready-made dispositions, pipelines and reports for the teams that live on the phone.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {industries.map((i) => (
              <article key={i.t} className="glass-card rounded-2xl p-7">
                <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary-glow">
                  <i.icon className="size-5" />
                </div>
                <h2 className="mt-5 text-xl font-semibold">{i.t}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{i.d}</p>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {i.pts.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-primary" /> {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <div className="glass-card mt-14 rounded-3xl p-10 text-center">
            <h2 className="text-2xl font-bold">Don't see your industry?</h2>
            <p className="mt-3 text-muted-foreground">WebDial is fully configurable — tell us your workflow.</p>
            <Button asChild variant="hero" size="lg" className="mt-6">
              <Link to="/contact">Talk to us</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
