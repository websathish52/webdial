import { Lock, ShieldCheck, Server, Eye, KeyRound, FileCheck2 } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import security from "@/assets/security-shield.jpg";

const points = [
  { icon: Lock, t: "Encrypted end to end", d: "TLS 1.3 in transit and AES-256 at rest for calls, recordings and lead data." },
  { icon: Server, d: "Hosted on Indian data centres with daily encrypted backups and 99.9% uptime.", t: "Data stays in India" },
  { icon: KeyRound, t: "Role based access", d: "Super admin, team admin and telecaller scopes — nobody sees more than they should." },
  { icon: Eye, t: "Full audit trail", d: "Every login, export, edit and call action is logged and searchable." },
  { icon: FileCheck2, t: "DPDP aligned", d: "Consent capture, DND handling and retention controls built into the workflow." },
  { icon: ShieldCheck, t: "No data resale, ever", d: "Your leads are yours. We never share, sell or train on your customer data." },
];

export function DataSafe() {
  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 lg:grid-cols-2">
        <Reveal direction="left">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary-glow">
            <ShieldCheck className="size-3.5" /> Security first
          </span>
          <h2 className="mt-6 text-3xl font-bold sm:text-4xl">
            Your Data Is <span className="text-gradient">Safe</span>
          </h2>
          <p className="mt-4 max-w-lg text-muted-foreground">
            WebDial is built with security, privacy and data safety in mind — from the first dial to
            the last report.
          </p>
          <div className="glass-card glow-ring mt-8 overflow-hidden rounded-2xl">
            <img
              src={security}
              alt="Encrypted WebDial infrastructure protecting call and lead data"
              width={1408}
              height={912}
              loading="lazy"
              className="w-full"
            />
          </div>
        </Reveal>

        <div className="grid gap-5 sm:grid-cols-2">
          {points.map((p, i) => (
            <Reveal key={p.t} direction="right" delay={i * 80}>
              <div className="glass-card h-full rounded-2xl p-6">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary-glow">
                  <p.icon className="size-5" />
                </div>
                <h3 className="mt-4 font-semibold">{p.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
