import { Button } from "@/components/ui/button";
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Headphones } from "lucide-react";

function PBXPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground rounded-xl p-8">
        <div className="flex items-center gap-3 mb-2">
          <Headphones className="size-8"/>
          <h2 className="text-2xl font-bold">Web Dail PBX <span className="text-xs bg-white/20 px-2 py-1 rounded ml-2">BETA</span></h2>
        </div>
        <p className="opacity-90">Cloud-based phone system with extensions, IVR, call routing, and recording — all in the browser.</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="w-full sm:w-auto">Activate PBX</Button>
          <Button variant="ghost" className="w-full text-white border border-white/30 hover:bg-white/10 sm:w-auto">Learn more</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        {[
          {icon:PhoneIncoming,label:"Inbound today",value:34,color:"text-success"},
          {icon:PhoneOutgoing,label:"Outbound today",value:128,color:"text-primary"},
          {icon:PhoneMissed,label:"Missed",value:7,color:"text-destructive"},
          {icon:Phone,label:"Extensions",value:12,color:"text-amber-500"},
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border p-5">
            <s.icon className={`size-5 mb-2 ${s.color}`}/>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border p-6">
        <h3 className="font-semibold mb-3">Extensions</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr><th className="p-2">Ext</th><th className="p-2">Agent</th><th className="p-2">Status</th><th className="p-2">Today's calls</th></tr>
          </thead>
          <tbody>
            {[
              {ext:"1001",agent:"Sidhartha Mohan",status:"online",calls:42},
              {ext:"1002",agent:"Shariya Mariyam",status:"online",calls:38},
              {ext:"1003",agent:"Ravi Kumar",status:"on call",calls:25},
              {ext:"1004",agent:"Anjali Sharma",status:"offline",calls:0},
            ].map(e => (
              <tr key={e.ext} className="border-b">
                <td className="p-2 font-mono">{e.ext}</td>
                <td className="p-2">{e.agent}</td>
                <td className="p-2"><span className={`text-xs px-2 py-1 rounded ${e.status==="online"?"bg-success/20 text-success":e.status==="on call"?"bg-amber-100 text-amber-700":"bg-muted text-muted-foreground"}`}>{e.status}</span></td>
                <td className="p-2">{e.calls}</td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PBXPage;
