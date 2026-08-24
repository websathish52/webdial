import { Link } from "react-router-dom";
import { Upload, Download, RefreshCw, Filter, Bot, MessageSquare, Kanban, ClipboardCheck, Mic, Globe, ChevronRight } from "lucide-react";

const tools = [
  { icon: Kanban, name: "Pipeline", desc: "Drag-and-drop sales pipeline with custom stages", to: "/pipeline", primary: true },
  { icon: ClipboardCheck, name: "Tasks", desc: "Create tasks, set reminders, assign to teammates", to: "/tasks", primary: true },
  { icon: Upload, name: "Bulk Import", desc: "Import leads from CSV/Excel files", to: "/crm" },
  { icon: Download, name: "Bulk Export", desc: "Export leads, calls and reports", to: "/reports" },
  { icon: RefreshCw, name: "Rechurn", desc: "Reassign uncalled leads automatically", to: "/crm" },
  { icon: Filter, name: "Lead Filter", desc: "Advanced filtering by any field", to: "/crm" },
  { icon: Bot, name: "AI Auto-Dial", desc: "Auto dial sequences with pacing", to: "/dialer" },
  { icon: MessageSquare, name: "SMS Blast", desc: "Bulk SMS to lead lists", to: "/whatsapp" },
  { icon: Mic, name: "Voice Notes", desc: "Record and attach voice notes", to: "/recording" },
  { icon: Globe, name: "API Tools", desc: "Webhooks and API integrations", to: "/integration" },
];

function ToolsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg">
        <h2 className="text-2xl sm:text-3xl font-bold">Tools</h2>
        <p className="opacity-90 text-sm mt-1">Everything you need to power up your call center — Pipeline, Tasks, Import/Export and more.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map(t => (
          <Link key={t.name} to={t.to as never} className={`bg-card rounded-xl border p-5 hover:border-primary transition group ${t.primary ? "ring-1 ring-blue-200" : ""}`}>
            <div className="flex items-start justify-between">
              <div className={`size-12 rounded-lg grid place-items-center mb-3 ${t.primary ? "bg-blue-500 text-white" : "bg-primary/10 text-primary"}`}><t.icon className="size-6"/></div>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary"/>
            </div>
            <h3 className="font-semibold">{t.name} {t.primary && <span className="text-[10px] bg-blue-500 text-white px-1.5 rounded font-bold ml-1">NEW</span>}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default ToolsPage;
