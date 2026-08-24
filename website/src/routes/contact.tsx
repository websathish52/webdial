import { useState } from "react";
import { Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/site/Reveal";
import { ContactMap } from "@/components/site/ContactStrip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitContactForm } from "@/lib/contact";
import teamImg from "../assets/team-callcenter.jpg";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  return (
    <div className="page-light min-h-screen">
      <Header />
      <main>
        <section className="section-navy">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 lg:grid-cols-2">
            <Reveal direction="left">
              <h1 className="text-4xl font-bold sm:text-5xl">
                Let's get your team <span className="text-gradient">dialing</span>
              </h1>
              <p className="mt-5 max-w-lg text-muted-foreground">
                Share a few details and our team will set up a demo account with your workflow inside
                24 hours.
              </p>
              <ul className="mt-10 space-y-4 text-sm">
                {[
                  { icon: Phone, t: "+91 90873 56563 / +91 99406 66924" },
                  { icon: MessageCircle, t: "WhatsApp: +91 90873 56563" },
                  { icon: Mail, t: "sathish@webdial.in" },
                  { icon: MapPin, t: "Anna Nagar, Chennai, Tamil Nadu, India" },
                  { icon: Clock, t: "Monday – Sunday · 9:30 AM – 7:30 PM IST" },
                ].map((c) => (
                  <li key={c.t} className="flex items-center gap-3 text-muted-foreground">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary-glow">
                      <c.icon className="size-4" />
                    </span>
                    {c.t}
                  </li>
                ))}
              </ul>

              {/* <div className="glass-card mt-10 overflow-hidden rounded-2xl">
                <img
                  src={teamImg}
                  alt="WebDial telecalling team on live calls"
                  width={1600}
                  height={1000}
                  loading="lazy"
                  className="w-full"
                />
              </div> */}
            </Reveal>

            <Reveal direction="right" delay={120}>
              <form
                className="glass-card rounded-2xl p-8"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSending(true);
                  const form = new FormData(e.currentTarget);
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
                    e.currentTarget.reset();
                    toast.success("Enquiry sent successfully. Our team will contact you shortly.");
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Unable to send your enquiry.");
                  } finally {
                    setSending(false);
                  }
                }}
              style={{    backgroundImage: "linear-gradient(356deg, rgb(230 238 255 / 98%), rgba(255, 255, 255, 0.96))"}}>
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
                    <Input id="email" name="email" type="email" required placeholder="you@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input id="phone" name="phone" required placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <Label htmlFor="agents">Number of telecallers</Label>
                  <Input id="agents" name="agents" type="number" min={1} placeholder="10" />
                </div>
                <div className="mt-4 space-y-2">
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
        </section>

        <ContactMap />
      </main>
      <Footer />
    </div>
  );
}
