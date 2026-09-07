import { useEffect, useMemo, useState } from "react";
import { MasterShell, Panel, StatGrid } from "@/components/layout/MasterShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

function SettingsPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [companyInfo, setCompanyInfo] = useState<any>({ organizationName: "WebDial", supportEmail: "sathish@webdial.in", officeHoursStart: "10:00", officeHoursEnd: "19:00" });
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [dialer, setDialer] = useState("Phone Dialer");
  const [policyToggles, setPolicyToggles] = useState([
    { key: "recording", label: "Force call recording", description: "Every outbound call is recorded for all tenants.", enabled: true },
    { key: "dnd", label: "Mandatory DND scrub", description: "Block lead imports that have not been scrubbed.", enabled: true },
    { key: "twoFactor", label: "Two-factor for admins", description: "Require OTP on every admin and master login.", enabled: true },
    { key: "export", label: "Allow tenant data export", description: "Team admins can export their own lead and call data.", enabled: false },
    { key: "whatsapp", label: "WhatsApp module", description: "Enable the WhatsApp suite for new tenants by default.", enabled: true },
    { key: "maintenance", label: "Maintenance banner", description: "Show a platform-wide notice inside every tenant app.", enabled: false },
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [customersRes, auditRes, companyRes, integrationsRes, dialerRes] = await Promise.all([
          api.getMasterCustomers(),
          api.getAudit({ limit: 10 }),
          api.getCompanyInfo().catch(() => null),
          api.getIntegrations().catch(() => []),
          api.getDialerSettings().catch(() => ({ selectedDialer: "Phone Dialer" })),
        ]);

        setCustomers(Array.isArray(customersRes?.customers) ? customersRes.customers : []);
        setAudit(Array.isArray(auditRes) ? auditRes : Array.isArray(auditRes?.entries) ? auditRes.entries : []);
        if (companyRes) setCompanyInfo((current: any) => ({ ...current, ...companyRes }));
        setIntegrations(Array.isArray(integrationsRes) ? integrationsRes : []);
        setDialer(dialerRes?.selectedDialer || "Phone Dialer");
      } catch (error) {
        console.error("Failed to load settings summary", error);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const summary = useMemo(() => ({
    totalCompanies: customers.length,
    activeChecks: Math.max(1, audit.length),
    rules: 44,
    syncHealth: audit.length ? "Healthy" : "No data",
  }), [customers, audit]);

  const handleSaveDefaults = async () => {
    try {
      setSaving(true);
      await api.updateCompanyInfo({
        ...companyInfo,
        organizationName: companyInfo.organizationName || "WebDial",
        website: companyInfo.website || "",
        description: companyInfo.description || "",
      });
      await api.updateDialerSettings(dialer);
      setSaving(false);
    } catch (error) {
      console.error("Failed to save platform defaults", error);
      setSaving(false);
    }
  };

  const handleIntegrationToggle = async (integration: any) => {
    try {
      await api.updateIntegration(integration.provider, {
        provider: integration.provider,
        name: integration.name,
        description: integration.description,
        connected: !integration.connected,
        config: integration.config || {},
      });
      setIntegrations((current) => current.map((item) => item.provider === integration.provider ? { ...item, connected: !item.connected } : item));
    } catch (error) {
      console.error("Failed to update integration", error);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Loading platform settings...</div>;
  }

  return (
    <MasterShell active="Platform Settings" title="Platform Settings" search="Search settings...">
      <StatGrid items={[
        { label: "Platform settings", value: String(policyToggles.length + 4), hint: "config items live" },
        { label: "Companies", value: String(summary.totalCompanies), hint: "clients active" },
        { label: "Rules", value: String(summary.rules), hint: "automation flows" },
        { label: "Sync status", value: summary.syncHealth, hint: `${summary.activeChecks} audit checks synced` },
      ]} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Platform defaults" subtitle="Applied to every new tenant">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand">Platform name</Label>
              <Input id="brand" value={companyInfo.organizationName || ""} onChange={(event) => setCompanyInfo({ ...companyInfo, organizationName: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="support">Support email</Label>
              <Input id="support" value={companyInfo.supportEmail || "sathish@webdial.in"} onChange={(event) => setCompanyInfo({ ...companyInfo, supportEmail: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dial">Max concurrent calls / agent</Label>
              <Input id="dial" type="number" value={companyInfo.maxConcurrentCalls ?? 3} onChange={(event) => setCompanyInfo({ ...companyInfo, maxConcurrentCalls: Number(event.target.value) || 3 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ret">Recording retention (days)</Label>
              <Input id="ret" type="number" value={companyInfo.recordingRetention ?? 90} onChange={(event) => setCompanyInfo({ ...companyInfo, recordingRetention: Number(event.target.value) || 90 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trial">Trial length (days)</Label>
              <Input id="trial" type="number" value={companyInfo.trialLength ?? 14} onChange={(event) => setCompanyInfo({ ...companyInfo, trialLength: Number(event.target.value) || 14 })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dialer-select">Default dialer</Label>
              <select
                id="dialer-select"
                value={dialer}
                onChange={(event) => setDialer(event.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="Phone Dialer">Phone Dialer</option>
                <option value="Click-to-Call">Click-to-Call</option>
                <option value="Predictive Dialer">Predictive Dialer</option>
                <option value="Agent Dashboard">Agent Dashboard</option>
              </select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="hours">Calling window (IST)</Label>
              <Input id="hours" value={`${companyInfo.officeHoursStart || "9:30"} – ${companyInfo.officeHoursEnd || "7:30"}`} onChange={(event) => setCompanyInfo({ ...companyInfo, officeHoursStart: event.target.value.split("–")[0].trim(), officeHoursEnd: event.target.value.split("–")[1]?.trim() || "19:30" })} />
            </div>
          </div>
          <Button variant="hero" className="mt-6" onClick={() => void handleSaveDefaults()} disabled={saving}>{saving ? "Saving..." : "Save defaults"}</Button>
        </Panel>

        <Panel title="Security & policy" subtitle="Platform-wide switches">
          <div className="space-y-4">
            {policyToggles.map((t) => (
              <div key={t.key} className="flex items-start justify-between gap-4 rounded-xl border border-border/60 p-4">
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                </div>
                <Switch checked={t.enabled} aria-label={t.label} onCheckedChange={(value) => setPolicyToggles((current) => current.map((item) => item.key === t.key ? { ...item, enabled: Boolean(value) } : item))} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Integrations" subtitle="Carriers, messaging and payment providers">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((i) => (
            <div key={i.provider || i.name} className="flex items-center justify-between rounded-xl border border-border/60 p-4">
              <div>
                <p className="text-sm font-medium">{i.name}</p>
                <p className="text-xs text-muted-foreground">{i.provider}</p>
              </div>
              {i.connected ? (
                <Badge variant="secondary" className="bg-success/15 text-success">Connected</Badge>
              ) : (
                <Button variant="outline" size="sm" onClick={() => void handleIntegrationToggle(i)}>Connect</Button>
              )}
            </div>
          ))}
        </div>
      </Panel>
    </MasterShell>
  );
}

export default SettingsPage;
