import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalPageLayoutProps = {
  eyebrow: string;
  title: string;
  intro: string;
  updated: string;
  sections: LegalSection[];
};

export function LegalPageLayout({ eyebrow, title, intro, updated, sections }: LegalPageLayoutProps) {
  return (
    <div className="page-light min-h-screen">
      <Header />
      <main>
        <section className="section-navy relative overflow-hidden border-b border-border/60">
          <div className="mx-auto max-w-5xl px-5 py-16 sm:py-20">
            <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-glow">
              <ArrowLeft className="size-4" /> Back to WebDial
            </Link>
            <div className="flex items-start gap-4">
              <div className="mt-1 hidden size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-lg sm:grid">
                <ShieldCheck className="size-6" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
                <h1 className="mt-3 max-w-4xl text-4xl font-bold leading-tight text-foreground sm:text-5xl">{title}</h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{intro}</p>
                <p className="mt-5 text-sm font-medium text-muted-foreground">Last updated: {updated}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface">
          <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_240px]">
            <article className="space-y-10">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mt-4 text-base leading-8 text-muted-foreground">{paragraph}</p>
                  ))}
                  {section.bullets && (
                    <ul className="mt-4 space-y-3 pl-5 text-base leading-7 text-muted-foreground">
                      {section.bullets.map((bullet) => <li key={bullet} className="list-disc">{bullet}</li>)}
                    </ul>
                  )}
                </section>
              ))}
            </article>

            <aside className="h-fit rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-card)] lg:sticky lg:top-28">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">WebDial legal</p>
              <nav className="mt-4 grid gap-2 text-sm font-medium">
                <Link to="/privacy-policy" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground">Privacy Policy</Link>
                <Link to="/terms" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground">Terms &amp; Conditions</Link>
                <Link to="/cookie-policy" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground">Cookie Policy</Link>
                <Link to="/contact" className="rounded-md px-3 py-2 text-muted-foreground hover:bg-accent hover:text-foreground">Contact WebDial</Link>
              </nav>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
