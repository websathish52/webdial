import { Reveal } from "@/components/site/Reveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Do I need any hardware or SIM boxes?",
    a: "No. WebDial is fully cloud based. Your telecallers only need a browser or the mobile app and a headset — we handle the telephony.",
  },
  {
    q: "Can I use my existing numbers and trunks?",
    a: "Yes. You can bring your own SIP trunk or GSM gateway, or use numbers provisioned through WebDial. Both work with the same dialer.",
  },
  {
    q: "How long does onboarding take?",
    a: "Most teams are live within a day. Upload your lead sheet, create telecaller logins, assign lists and start dialing.",
  },
  {
    q: "Are calls recorded and where is the data stored?",
    a: "Every call can be recorded and stored securely with role-based access. Data stays encrypted at rest and in transit on Indian data centres.",
  },
  {
    q: "Can supervisors track attendance and productivity?",
    a: "Yes. The dashboard shows live status, talk time, calls per agent, dispositions, attendance and pipeline movement in real time.",
  },
  {
    q: "Is there a free trial?",
    a: "We set up a guided demo account with your own sample data so your team can test the full workflow before you commit.",
  },
];

export function Faq() {
  return (
    <section className="bg-surface py-20">
      <div className="mx-auto max-w-3xl px-5">
        <Reveal>
          <h2 className="text-center text-3xl font-bold sm:text-4xl">Frequently asked questions</h2>
          <p className="mt-3 text-center text-muted-foreground">
            Everything teams usually ask before switching to WebDial.
          </p>
        </Reveal>

        <Reveal delay={100}>
          <Accordion type="single" collapsible className="mt-10">
            {faqs.map((f) => (
              <AccordionItem key={f.q} value={f.q}>
                <AccordionTrigger className="text-left text-base">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
