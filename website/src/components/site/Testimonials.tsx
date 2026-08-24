import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const items = [
  {
    quote:
      "Our admissions team moved from spreadsheets to WebDial in a day. Talk time per counsellor went up nearly 40% in the first month.",
    name: "Priya Raghavan",
    role: "Head of Admissions, Galaxy Edu",
  },
  {
    quote:
      "The auto dialer plus WhatsApp follow-up combo is the reason our site visit bookings doubled. Agents never forget a callback now.",
    name: "Karthik Menon",
    role: "Sales Director, Nexa Realty",
  },
  {
    quote:
      "As a founder I finally see live productivity, attendance and recordings in one console instead of chasing daily reports.",
    name: "Sathish Kumar",
    role: "Founder, FinServe Advisors",
  },
  {
    quote:
      "Support is genuinely fast, and the master console makes managing four branches feel like managing one.",
    name: "Anita Desai",
    role: "Operations Lead, MedCare",
  },
];

export function Testimonials() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  const active = items[i]!;

  return (
    <section className="section-navy py-20">
      <div
        className="mx-auto max-w-4xl px-5"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <Reveal>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Loved by calling teams</h2>
          <p className="mt-3 text-center text-muted-foreground">
            Real results from teams running outbound sales on WebDial every day.
          </p>
        </Reveal>

        <Reveal direction="zoom" delay={120}>
          <div className="card-light mt-12 rounded-3xl border border-border p-8 sm:p-12">
            <Quote className="size-8 text-primary opacity-80" />
            <blockquote key={i} className="animate-fade-in mt-5 text-lg leading-relaxed sm:text-xl">
              "{active.quote}"
            </blockquote>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{active.name}</p>
                <p className="text-sm text-muted-foreground">{active.role}</p>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, s) => (
                  <Star key={s} className="size-4 fill-current" />
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <div className="flex gap-2">
                {items.map((it, idx) => (
                  <button
                    key={it.name}
                    aria-label={`Show testimonial ${idx + 1}`}
                    onClick={() => setI(idx)}
                    className={
                      "h-2 rounded-full transition-all " +
                      (idx === i ? "w-8 bg-current" : "w-2 bg-current/40")
                    }
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  aria-label="Previous testimonial"
                  onClick={() => setI((v) => (v - 1 + items.length) % items.length)}
                  className="rounded-full border border-border/60 p-2 transition-colors hover:bg-background/20"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  aria-label="Next testimonial"
                  onClick={() => setI((v) => (v + 1) % items.length)}
                  className="rounded-full border border-border/60 p-2 transition-colors hover:bg-background/20"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
