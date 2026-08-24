import { BookOpen, CircleHelp, FileText } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function Resources() {
  return <div className="page-light min-h-screen"><Header /><main>
    <section className="section-navy"><div className="mx-auto max-w-4xl px-5 py-20 text-center"><h1 className="text-4xl font-bold sm:text-5xl">Resources for better calling</h1><p className="mt-5 text-lg text-muted-foreground">Guides, answers and practical ideas to help your team get more from WebDial.</p></div></section>
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-20 md:grid-cols-3"><div id="faq" className="glass-card rounded-2xl p-7"><CircleHelp className="size-7 text-primary" /><h2 className="mt-5 text-xl font-semibold">FAQ</h2><p className="mt-2 text-sm text-muted-foreground">Answers to common questions about setup, calling and plans.</p></div><div id="help" className="glass-card rounded-2xl p-7"><BookOpen className="size-7 text-primary" /><h2 className="mt-5 text-xl font-semibold">Help center</h2><p className="mt-2 text-sm text-muted-foreground">Find clear guidance for admins, supervisors and telecallers.</p></div><div id="cases" className="glass-card rounded-2xl p-7"><FileText className="size-7 text-primary" /><h2 className="mt-5 text-xl font-semibold">Case studies</h2><p className="mt-2 text-sm text-muted-foreground">See how calling teams improve follow-up and productivity.</p></div></section>
  </main><Footer /></div>;
}