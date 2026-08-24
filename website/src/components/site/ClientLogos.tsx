import { Reveal } from "@/components/site/Reveal";

const logos = [
  { src: "https://www.ifoxclicks.com/src/assets/google-BJaySX_4.png", alt: "Google" },
  { src: "https://www.ifoxclicks.com/src/assets/trust-CDoaol6G.png", alt: "Trustpilot" },
  { src: "https://www.ifoxclicks.com/src/assets/gar-Biv5DYh-.png", alt: "Gartner" },
  { src: "https://www.ifoxclicks.com/src/assets/hub-DDqdOxFs.png", alt: "HubSpot" },
  { src: "https://www.ifoxclicks.com/src/assets/clutch-kqvJyjCl.png", alt: "Clutch" },
  { src: "https://www.ifoxclicks.com/src/assets/zoho-uIp-fYE3.png", alt: "Zoho" },
];

export function ClientLogos() {
  const loop = [...logos, ...logos];

  return (
    <section className="border-y border-border bg-surface py-20">
      <div className="mx-auto max-w-7xl px-5">
        <Reveal>
          <p className="text-center text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
            Trusted by 50+ calling teams across India
          </p>
        </Reveal>

        <div
          className="relative mt-10 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
          }}
        >
          <div className="marquee-track flex w-max items-center gap-14">
            {loop.map((l, i) => (
              <img
                key={`${l.alt}-${i}`}
                src={l.src}
                alt={`${l.alt} logo`}
                height={30}
                loading="lazy"
                className="h-8 w-auto shrink-0 opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
