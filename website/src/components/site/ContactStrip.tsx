import { useState } from "react";
import { toast } from "sonner";
import { Phone, MessageCircle, Mail, Clock, MapPin } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitContactForm } from "@/lib/contact";

export const MAP_SRC =
  "https://www.google.com/maps?q=Anna%20Nagar%2C%20Chennai%2C%20Tamil%20Nadu&output=embed";

const cards = [
  {
    icon: Phone,
    title: "Call us",
    lines: ["+91 90873 56563", "+91 99406 66924"],
    href: "tel:+919087356563",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    lines: ["+91 90873 56563"],
    href: "https://wa.me/919087356563",
  },
  {
    icon: Mail,
    title: "Email",
    lines: ["sathish@webdial.in"],
    href: "mailto:sathish@webdial.in",
  },
  {
    icon: Clock,
    title: "Digital hours",
    lines: ["Monday – Sunday", "9:30 AM – 7:30 PM IST"],
  },
];

export function ContactStrip() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  return (
    <section id="contact" className="bg-background py-20">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal direction="up">
          <div className="mx-auto max-w-3xl text-center">
            <p className="heads text-blue-500 font-semibold mb-4 animate-slide-up">Contact</p>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
              Get in Touch <br />
              <span className="text-gradient"> We are here to help</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
              Have questions about WebDial or want to schedule a demo? Our team is ready to help you
              find the right calling workflow for your business.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          <Reveal direction="left" className="lg:col-span-1">
            <h3 className="text-2xl font-bold">Contact information</h3>
            <div className="mt-6 space-y-4">
              {cards.map((c, i) => (
                <div
                  key={c.title}
                  className="rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-md"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <c.icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold">{c.title}</h4>
                      <div className="mt-1 space-y-1 text-sm text-muted-foreground">
                        {c.lines.map((l) =>
                          c.href ? (
                            <a key={l} href={c.href} className="block break-words hover:text-primary">
                              {l}
                            </a>
                          ) : (
                            <p key={l}>{l}</p>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal direction="right" delay={120} className="lg:col-span-2">
            <form
              className="glass-card rounded-2xl p-8"
              onSubmit={async (event) => {
                event.preventDefault();
                setSending(true);
                const form = new FormData(event.currentTarget);
                try {
                  await submitContactForm({
                    name: String(form.get("name") ?? ""),
                    email: String(form.get("email") ?? ""),
                    phone: String(form.get("phone") ?? ""),
                    company: String(form.get("company") ?? ""),
                    service: `Telecallers: ${String(form.get("agents") ?? "N/A")}`,
                    message: String(form.get("message") ?? ""),
                  });
                  setSent(true);
                  event.currentTarget.reset();
                  toast.success("Enquiry sent successfully. Our team will contact you shortly.");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Unable to send your enquiry.");
                } finally {
                  setSending(false);
                }
              }}
           style={{ backgroundImage: "linear-gradient(356deg, rgb(230 238 255 / 98%), rgba(255, 255, 255, 0.96))" }}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                    <Input id="name" name="name" required placeholder="Sathish Kumar" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                    <Input id="company" name="company" placeholder="WebDial Pvt Ltd" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required placeholder="mail@example.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" required placeholder="+91 98765 43210" />
                </div>
              </div>
              <div className="mt-5 space-y-2">
                <Label htmlFor="agents">Number of telecallers</Label>
                <Input id="agents" name="agents" type="number" min={1} placeholder="10" />
              </div>
              <div className="mt-5 space-y-2">
                <Label htmlFor="msg">What do you need?</Label>
                <Textarea id="msg" name="message" required rows={4} placeholder="We run an outbound admissions team..." />
              </div>
              <Button type="submit" variant="hero" size="lg" className="mt-6 w-full rounded-sm">
                {sending ? "Sending..." : sent ? "Request received" : "Request a demo"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                No spam. We only use your details to contact you about WebDial.
              </p>
            </form>
          </Reveal>

        </div>
      </div>
    </section>
  );
}

export function ContactMap() {
  return (
    <section className=" pb-20">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal>
          <div className="overflow-hidden rounded-2xl border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-card px-5 py-4 text-sm font-medium">
              <MapPin className="size-4 text-primary" /> WebDial Office — Anna Nagar, Chennai
            </div>
            <iframe title="WebDial office location in Anna Nagar, Chennai" src={MAP_SRC} width="100%" height="380" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="block w-full border-0" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
