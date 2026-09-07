import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  FileText,
  Code2,
  Settings2,
  UsersRound,
  RadioTower,
  Star,
  Copy,
  Check,
  Eye,
  LayoutGrid,
} from "lucide-react";

type List = { id: string; name: string };

type FieldKey = "name" | "email" | "secondaryPhone" | "remarks" | "legalText" | "companyName" | "phone" | "extra" | "note";

const fieldLabels: Record<FieldKey, string> = {
  name: "Name",
  email: "Email",
  secondaryPhone: "Secondary Phone",
  remarks: "Remarks",
  legalText: "Legal Text",
  companyName: "Company Name",
  phone: "Phone",
  extra: "Extra",
  note: "Note",
};

const colorSwatches = ["#EF4444", "#EC4899", "#8B5CF6", "#3B82F6", "#06B6D4", "#22C55E", "#EAB308", "#78350F", "#111827"];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };
  return (
    <button onClick={copy} className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium hover:bg-white/25">
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function WebFormsPage() {
  const [lists, setLists] = useState<List[]>([]);
  const [listId, setListId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("Untitled");
  const [formSubTitle, setFormSubTitle] = useState("Subtitle");
  const [fields, setFields] = useState<Record<FieldKey, boolean>>({
    name: true,
    email: false,
    secondaryPhone: false,
    remarks: false,
    legalText: false,
    companyName: false,
    phone: false,
    extra: false,
    note: false,
  });
  const [disclaimer, setDisclaimer] = useState("By clicking, I am aware of the terms and condition and privacy policy");
  const [buttonText, setButtonText] = useState("Submit");
  const [formWidth, setFormWidth] = useState("500");
  const [redirectUrl, setRedirectUrl] = useState("https://webdial.in");
  const [color, setColor] = useState(colorSwatches[3]);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [available, saved] = await Promise.all([api.getContactLists(), api.getWebForm()]);
        const parsed = Array.isArray(available) ? available : [];
        setLists(parsed);
        if (parsed.length) setListId(parsed[0].id);
        if (saved && typeof saved === "object") {
          if (typeof saved.listId === "string") setListId(saved.listId);
          if (typeof saved.formTitle === "string") setFormTitle(saved.formTitle);
          if (typeof saved.formSubTitle === "string") setFormSubTitle(saved.formSubTitle);
          if (Array.isArray(saved.fields)) setFields((current) => Object.fromEntries(Object.keys(current).map((key) => [key, saved.fields.includes(key)])) as Record<FieldKey, boolean>);
          if (typeof saved.disclaimer === "string") setDisclaimer(saved.disclaimer);
          if (typeof saved.buttonText === "string") setButtonText(saved.buttonText);
          if (typeof saved.formWidth === "string") setFormWidth(saved.formWidth);
          if (typeof saved.redirectUrl === "string") setRedirectUrl(saved.redirectUrl);
          if (typeof saved.color === "string") setColor(saved.color);
          if (saved.theme === "light" || saved.theme === "dark") setTheme(saved.theme);
        }
      } catch (error: any) {
        toast.error(error?.message || "Could not load lists");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const toggleField = (key: FieldKey) => setFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const activeFields = (Object.keys(fields) as FieldKey[]).filter((k) => fields[k]);

  const htmlCode = useMemo(() => {
    const inputs = activeFields
      .map(
        (f) =>
          `      <input type="text" name="${f}" placeholder="${fieldLabels[f]}" class="gd-input" />`
      )
      .join("\n");
    return `<div class="gd-form" style="max-width:${formWidth}px" data-list="${listId}">
  <form action="${redirectUrl}" method="POST">
    <h3 class="gd-title">${formTitle}</h3>
    <p class="gd-subtitle">${formSubTitle}</p>
${inputs}
    <label class="gd-disclaimer"><input type="checkbox" required /> ${disclaimer}</label>
    <button type="submit" class="gd-submit">${buttonText}</button>
  </form>
</div>`;
  }, [activeFields, formTitle, formSubTitle, disclaimer, buttonText, formWidth, redirectUrl, listId]);

  const cssCode = useMemo(
    () => `.gd-form {
  font-family: sans-serif;
  background: ${theme === "dark" ? "#0f172a" : "#ffffff"};
  color: ${theme === "dark" ? "#ffffff" : "#111827"};
  border-radius: 12px;
  padding: 24px;
}
.gd-title { font-size: 20px; font-weight: 700; margin: 0 0 4px; }
.gd-subtitle { font-size: 13px; opacity: 0.7; margin: 0 0 16px; }
.gd-input {
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 6px;
  border: 1px solid ${theme === "dark" ? "#334155" : "#d1d5db"};
  background: ${theme === "dark" ? "#1e293b" : "#f9fafb"};
  color: inherit;
}
.gd-disclaimer { display: block; font-size: 11px; opacity: 0.7; margin: 8px 0; }
.gd-submit {
  width: 100%;
  padding: 10px;
  border: none;
  border-radius: 6px;
  background: ${color};
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}`,
    [theme, color]
  );

  const saveForm = async () => {
    try {
      setSaving(true);
      await api.saveWebForm({
        listId,
        formTitle,
        formSubTitle,
        fields: activeFields,
        disclaimer,
        buttonText,
        formWidth,
        redirectUrl,
        color,
        theme,
      });
      toast.success("Web form saved");
    } catch (error: any) {
      toast.error(error?.message || "Could not save the web form");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading web forms...</div>;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Web Forms</h1>
              <p className="text-xs text-white/85">Embed custom forms into your website and get leads from it</p>
            </div>
          </div>

          <Button onClick={() => void saveForm()} disabled={saving} size="sm" className="gap-1.5 bg-white/15 hover:bg-white/25">
            <Star className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save as Favourite"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
            <Code2 className="h-3.5 w-3.5" /> Embed Code
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
            <Settings2 className="h-3.5 w-3.5" /> Customizable
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
            <RadioTower className="h-3.5 w-3.5" /> Instant leads
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
            <UsersRound className="h-3.5 w-3.5" /> Responsive
          </span>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Form builder */}
        <Card className="overflow-hidden rounded-2xl p-0">
          <div className="flex items-center justify-between bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_100%)] px-4 py-2.5 text-white">
            <LayoutGrid className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Form Builder</span>
          </div>

          <div className="space-y-4 p-5">
            <Select value={listId} onValueChange={setListId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a list" />
              </SelectTrigger>
              <SelectContent>
                {lists.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Form Title</span>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Form Sub Title</span>
              <Input value={formSubTitle} onChange={(e) => setFormSubTitle(e.target.value)} />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-medium text-muted-foreground">Fields in Form</span>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                {(Object.keys(fieldLabels) as FieldKey[]).map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-blue-700">
                    <input
                      type="checkbox"
                      checked={fields[key]}
                      onChange={() => toggleField(key)}
                      className="h-4 w-4 accent-blue-600"
                    />
                    {fieldLabels[key]}
                  </label>
                ))}
              </div>
            </div>

            <Input
              value={disclaimer}
              onChange={(e) => setDisclaimer(e.target.value)}
              placeholder="By clicking, I am aware of the terms and condition and privacy policy"
            />

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Button Text</span>
              <Input value={buttonText} onChange={(e) => setButtonText(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Form Width</span>
              <Input value={formWidth} onChange={(e) => setFormWidth(e.target.value)} />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Redirect URL</span>
              <Input value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Color</span>
              <div className="flex flex-wrap gap-2">
                {colorSwatches.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className="flex h-6 w-6 items-center justify-center rounded-full ring-offset-2"
                    style={{ backgroundColor: c, boxShadow: color === c ? "0 0 0 2px white, 0 0 0 4px #2563EB" : undefined }}
                  >
                    {color === c && <Check className="h-3.5 w-3.5 text-white" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">Theme</span>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={theme === "light"} onChange={() => setTheme("light")} className="accent-blue-600" />
                  Light
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" checked={theme === "dark"} onChange={() => setTheme("dark")} className="accent-blue-600" />
                  Dark
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Preview */}
        <Card className="overflow-hidden rounded-2xl p-0">
          <div className="flex items-center justify-between bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_100%)] px-4 py-2.5 text-white">
            <Eye className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">Form Preview</span>
          </div>

          <div className="flex items-center justify-center p-8">
            <div
              className="w-full rounded-xl p-6"
              style={{
                maxWidth: `${formWidth}px`,
                background: theme === "dark" ? "#0f172a" : "#ffffff",
                color: theme === "dark" ? "#ffffff" : "#111827",
                border: theme === "light" ? "1px solid #e5e7eb" : undefined,
              }}
            >
              <p className="text-lg font-bold">{formTitle}</p>
              <p className="mb-4 text-xs opacity-70">{formSubTitle}</p>
              {activeFields.map((f) => (
                <div
                  key={f}
                  className="mb-2 rounded-md px-3 py-2 text-xs opacity-70"
                  style={{
                    background: theme === "dark" ? "#1e293b" : "#f9fafb",
                    border: `1px solid ${theme === "dark" ? "#334155" : "#d1d5db"}`,
                  }}
                >
                  {fieldLabels[f]}
                </div>
              ))}
              <p className="my-2 text-[10px] opacity-60">{disclaimer}</p>
              <button
                className="mt-2 w-full rounded-md py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: color }}
              >
                {buttonText}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* HTML Code */}
      <Card className="overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_100%)] px-4 py-2.5 text-white">
          <span className="text-xs font-semibold uppercase tracking-wide">HTML Code</span>
          <CopyButton text={htmlCode} />
        </div>
        <pre className="overflow-x-auto p-4 text-xs text-muted-foreground">{htmlCode}</pre>
      </Card>

      {/* CSS Code */}
      <Card className="overflow-hidden rounded-2xl p-0">
        <div className="flex items-center justify-between bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_100%)] px-4 py-2.5 text-white">
          <span className="text-xs font-semibold uppercase tracking-wide">CSS Code</span>
          <CopyButton text={cssCode} />
        </div>
        <pre className="overflow-x-auto p-4 text-xs text-muted-foreground">{cssCode}</pre>
      </Card>
    </div>
  );
}