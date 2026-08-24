import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  { name: "Starter", price: "₹199", per: "user/month", popular: false, features: ["Up to 5 agents", "Auto dialer", "Lead CRM", "Basic reports", "Email support"] },
  { name: "Pro", price: "₹499", per: "user/month", popular: true, features: ["Unlimited agents",
      "WhatsApp suite",
      "Pipeline & tasks",
      "Call recording",
      "Performance & attendance",
      "Priority support"] },
  // { name: "Enterprise", price: "Custom", per: "contact us", popular: false, features: ["Unlimited users", "Web Dail PBX included", "Custom integrations", "Dedicated success manager", "On-prem option", "SLA guarantee"] },
];

function SubscribePage() {
  return (
    <div className="p-6 space-y-6">
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold">Choose your plan</h2>
        <p className="text-muted-foreground mt-2">Scale your call center with the right tier. Cancel anytime.</p>
      </div>
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
        {plans.map(p => (
          <div key={p.name} className={`rounded-xl border bg-card p-6 ${p.popular ? "ring-2 ring-primary shadow-lg" : ""}`}>
            {p.popular && <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">MOST POPULAR</div>}
            <h3 className="text-xl font-bold">{p.name}</h3>
            <div className="mt-3"><span className="text-4xl font-bold">{p.price}</span> <span className="text-sm text-muted-foreground">{p.per}</span></div>
            <Button className={`w-full mt-4 ${p.popular ? "bg-primary" : ""}`} variant={p.popular ? "default" : "outline"}>Subscribe</Button>
            <ul className="mt-6 space-y-2 text-sm">
              {p.features.map(f => <li key={f} className="flex gap-2"><Check className="size-4 text-success shrink-0 mt-0.5"/>{f}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SubscribePage;
