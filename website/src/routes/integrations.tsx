import { Code2, Globe2, Webhook } from "lucide-react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";

export default function Integrations() {
  return <div className="page-light min-h-screen"><Header /><main>
    <section className="section-navy"><div className="mx-auto max-w-4xl px-5 py-20 text-center"><h1 className="text-4xl font-bold sm:text-5xl">Connect your entire workflow</h1><p className="mt-5 text-lg text-muted-foreground">Bring leads, conversations and outcomes together with WebDial integrations.</p></div></section>
    <section className="mx-auto grid max-w-7xl gap-6 px-5 py-20 md:grid-cols-3"><div className="glass-card rounded-2xl p-7"><Globe2 className="size-7 text-primary" /><h2 className="mt-5 text-xl font-semibold">All integrations</h2><p className="mt-2 text-sm text-muted-foreground">Connect CRM tools, spreadsheets, forms and messaging workflows.</p></div><div id="api" className="glass-card rounded-2xl p-7"><Code2 className="size-7 text-primary" /><h2 className="mt-5 text-xl font-semibold">Developer API</h2><p className="mt-2 text-sm text-muted-foreground">Build custom lead sync, reporting and automation with a clear REST API.</p></div><div id="webhooks" className="glass-card rounded-2xl p-7"><Webhook className="size-7 text-primary" /><h2 className="mt-5 text-xl font-semibold">Webhooks</h2><p className="mt-2 text-sm text-muted-foreground">Send call outcomes, lead updates and task events to your own systems.</p></div></section>
  </main><Footer /></div>;
}