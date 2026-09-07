"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Link2,
  List,
  LineChart,
  SquarePen,
  Trash2,
  Package,
  Briefcase,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Image as ImageIcon,
  Smartphone,
  FileText,
  Check,
  X,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type PageStatus = "draft" | "published";

interface GoPage {
  id: string;
  title: string;
  status: PageStatus;
  createdAt: string;
  slug: string;
  views: number;
  leads: number;
}

type OfferingType = "product" | "service";

interface FAQ {
  question: string;
  answer: string;
}

interface WizardData {
  offeringType: OfferingType;
  name: string;
  websiteUrl: string;
  godialList: string;
  description: string;
  usp: string;
  features: string;
  faqs: FAQ[];
  layout: "hero-model" | "split-focus" | "minimalist";
  colorTheme: "minimal" | "corporate" | "modern-ai" | "startup-pop";
}

const DEFAULT_WIZARD_DATA: WizardData = {
  offeringType: "product",
  name: "",
  websiteUrl: "",
  godialList: "",
  description: "",
  usp: "",
  features: "",
  faqs: [],
  layout: "split-focus",
  colorTheme: "corporate",
};

const LAYOUTS: {
  id: WizardData["layout"];
  title: string;
  description: string;
  icon: typeof ImageIcon;
}[] = [
  { id: "hero-model", title: "Hero Model", description: "Full-width hero header leading to your forms", icon: ImageIcon },
  { id: "split-focus", title: "Split Focus", description: "Side-by-side content and sticky form", icon: Smartphone },
  { id: "minimalist", title: "Minimalist", description: "Clean, direct forms without bulk", icon: FileText },
];

const COLOR_THEMES: {
  id: WizardData["colorTheme"];
  label: string;
  swatch: string;
  panelBg: string;
  labelClass?: string;
}[] = [
  { id: "minimal", label: "Minimal", swatch: "#111827", panelBg: "#FFFFFF" },
  { id: "corporate", label: "Corporate", swatch: "#2563EB", panelBg: "#FFFFFF" },
  { id: "modern-ai", label: "Modern AI", swatch: "#7C3AED", panelBg: "#0B1220" },
  { id: "startup-pop", label: "Startup Pop", swatch: "#EF4444", panelBg: "#FDECEC" },
];

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

const INITIAL_PAGES: GoPage[] = [
  {
    id: "1",
    title: "mm,",
    status: "draft",
    createdAt: "04 Sept 2026",
    slug: "https://land.webdial.in/mm",
    views: 0,
    leads: 0,
  },
];

/* ------------------------------------------------------------------ */
/*  Page card                                                          */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: PageStatus }) {
  const isDraft = status === "draft";
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        isDraft ? "bg-slate-400 text-white" : "bg-blue-600 text-white"
      }`}
    >
      {isDraft ? "draft" : "published"}
    </span>
  );
}

function PageCard({
  page,
  onEdit,
  onDelete,
}: {
  page: GoPage;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"leads" | "analytics">("leads");

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
      <div className="border-b border-dashed border-blue-100 px-5 pb-4 pt-5">
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-bold text-slate-900">{page.title}</h3>
          <StatusBadge status={page.status} />
        </div>
        <p className="mt-3 text-xs text-slate-400">Created: {page.createdAt}</p>
      </div>

      <div className="px-5 py-4">
        <div className="flex items-center gap-2 text-sm text-blue-500">
          <Link2 className="h-4 w-4" />
          <span>{page.slug}</span>
        </div>

        <div className="mt-5 flex items-center gap-16">
          <div>
            <p className="text-xs text-slate-400">Views</p>
            <p className="text-xl font-bold text-slate-900">{page.views}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Leads</p>
            <p className="text-xl font-bold text-blue-600">{page.leads}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-blue-100 bg-blue-50/60 px-5 py-3">
        <div className="flex items-center gap-4 text-sm font-semibold">
          <button
            onClick={() => setActiveTab("leads")}
            className={`flex items-center gap-1.5 ${
              activeTab === "leads" ? "text-blue-600" : "text-slate-400"
            }`}
          >
            <List className="h-4 w-4" />
            Leads
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex items-center gap-1.5 ${
              activeTab === "analytics" ? "text-blue-600" : "text-slate-500"
            }`}
          >
            <LineChart className="h-4 w-4" />
            Analytics
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onEdit(page.id)}
            className="text-slate-500 hover:text-blue-700"
            aria-label="Edit page"
          >
            <SquarePen className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(page.id)}
            className="text-red-500 hover:text-red-700"
            aria-label="Delete page"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wizard: step indicator                                             */
/* ------------------------------------------------------------------ */

function StepIndicator({ step }: { step: 1 | 2 | 3 }) {
  const steps = [
    { n: 1, label: "Basic Info" },
    { n: 2, label: "Features &\nMedia" },
    { n: 3, label: "Layout & Style" },
  ] as const;

  return (
    <div className="flex items-center border-b border-blue-100 px-8 pb-6 pt-6">
      {steps.map((s, i) => {
        const done = step > s.n;
        const active = step === s.n;
        return (
          <div key={s.n} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold text-white ${
                  done || active ? "bg-blue-600" : "bg-slate-300"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : s.n}
              </div>
              <span
                className={`whitespace-pre-line text-center text-sm ${
                  active ? "font-semibold text-blue-700" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="mx-3 mb-6 h-px flex-1 bg-blue-100" />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wizard: step 1                                                     */
/* ------------------------------------------------------------------ */

function StepBasicInfo({
  data,
  update,
  onNext,
  analyzing,
  godialLists,
}: {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  onNext: () => void | Promise<void>;
  analyzing?: boolean;
  godialLists: string[];
}) {
  const isValid = data.name.trim() !== "" && data.godialList !== "";

  return (
    <div className="px-8 py-8">
      <h2 className="text-2xl font-bold text-slate-900">Tell us about your business</h2>
      <p className="mt-1 text-sm text-slate-400">
        Step 1 of 3 — We&apos;ll use this to generate your landing page
      </p>

      <p className="mt-8 mb-3 text-sm font-medium text-slate-500">
        What is this landing page about?
      </p>
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => update({ offeringType: "product" })}
          className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold ${
            data.offeringType === "product"
              ? "bg-blue-600 text-white"
              : "bg-blue-50 text-slate-600"
          }`}
        >
          <Package className="h-4 w-4" />A Product
        </button>
        <button
          onClick={() => update({ offeringType: "service" })}
          className={`flex items-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold ${
            data.offeringType === "service"
              ? "bg-blue-600 text-white"
              : "bg-blue-50 text-slate-600"
          }`}
        >
          <Briefcase className="h-4 w-4" />A Service
        </button>
      </div>

      <div className="space-y-4">
        <input
          value={data.name}
          onChange={(e) => update({ name: e.target.value })}
          placeholder={data.offeringType === "product" ? "Product Name *" : "Business Name *"}
          className="w-full rounded-lg border border-blue-200 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <div className="flex items-center gap-2 rounded-lg border border-blue-200 px-4 py-3">
          <Link2 className="h-4 w-4 text-blue-400" />
          <input
            value={data.websiteUrl}
            onChange={(e) => update({ websiteUrl: e.target.value })}
            placeholder="Website URL (Optional)"
            className="w-full text-sm text-slate-700 placeholder-slate-400 outline-none"
          />
        </div>

        <select
          value={data.godialList}
          onChange={(e) => update({ godialList: e.target.value })}
          className="w-full rounded-lg border border-blue-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Select a GoDial List *</option>
          {godialLists.map((list) => (
            <option key={list} value={list}>
              {list}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          onClick={onNext}
          disabled={!isValid || analyzing}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold ${
            isValid
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "cursor-not-allowed bg-blue-50 text-slate-400"
          }`}
        >
          {analyzing ? "Analyzing..." : "Next"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wizard: step 2                                                     */
/* ------------------------------------------------------------------ */

function StepFeaturesMedia({
  data,
  update,
  onBack,
  onNext,
}: {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const isValid = data.description.trim() !== "";
  const noun = data.offeringType === "service" ? "Service" : "Product";

  const addFaq = () => update({ faqs: [...data.faqs, { question: "", answer: "" }] });

  return (
    <div className="px-8 py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
        Step 2 of 3
      </p>
      <h2 className="mt-1 text-2xl font-bold text-slate-900">Sell Your {noun}</h2>
      <p className="mt-1 text-sm text-slate-400">
        Verify the extracted details or add your own to help our AI generate compelling copy and
        structure your page sections.
      </p>

      <div className="mt-8 space-y-4">
        <textarea
          value={data.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="What does your business do? *"
          rows={4}
          className="w-full resize-none rounded-lg border border-blue-200 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <div className="flex items-center gap-2">
          <input
            value={data.usp}
            onChange={(e) => update({ usp: e.target.value })}
            placeholder="What is your USP (Unique Selling Proposition)?"
            className="w-full rounded-lg border border-blue-200 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <HelpCircle className="h-5 w-5 shrink-0 text-blue-300" />
        </div>

        <input
          value={data.features}
          onChange={(e) => update({ features: e.target.value })}
          placeholder="Features you wish to mention"
          className="w-full rounded-lg border border-blue-200 px-4 py-3 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <div>
          <p className="mb-2 text-sm font-medium text-slate-500">FAQs (Optional)</p>
          <div className="space-y-3">
            {data.faqs.map((faq, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    value={faq.question}
                    onChange={(e) => {
                      const next = [...data.faqs];
                      next[i] = { ...next[i], question: e.target.value };
                      update({ faqs: next });
                    }}
                    placeholder="Question"
                    className="w-full rounded-lg border border-blue-200 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                  <input
                    value={faq.answer}
                    onChange={(e) => {
                      const next = [...data.faqs];
                      next[i] = { ...next[i], answer: e.target.value };
                      update({ faqs: next });
                    }}
                    placeholder="Answer"
                    className="w-full rounded-lg border border-blue-200 px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button
                  onClick={() => update({ faqs: data.faqs.filter((_, idx) => idx !== i) })}
                  className="mt-2 text-slate-400 hover:text-red-500"
                  aria-label="Remove FAQ"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={addFaq}
            className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-blue-600"
          >
            <Plus className="h-4 w-4" />
            Add FAQ
          </button>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold ${
            isValid
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "cursor-not-allowed bg-blue-50 text-slate-400"
          }`}
        >
          Next Step
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wizard: step 3                                                     */
/* ------------------------------------------------------------------ */

function StepLayoutStyle({
  data,
  update,
  onBack,
  onGenerate,
  generating,
}: {
  data: WizardData;
  update: (patch: Partial<WizardData>) => void;
  onBack: () => void;
  onGenerate: () => void;
  generating?: boolean;
}) {
  return (
    <div className="px-8 py-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
        Step 3 of 3
      </p>
      <h2 className="mt-1 text-2xl font-bold text-slate-900">Choose Layout &amp; Theme</h2>
      <p className="mt-1 text-sm text-slate-400">
        Pick a starting layout and a color theme. You can completely change this later in the
        editor!
      </p>

      <p className="mt-8 mb-3 text-sm font-semibold text-slate-700">Starting Layout</p>
      <div className="grid grid-cols-3 gap-4">
        {LAYOUTS.map((layout) => {
          const selected = data.layout === layout.id;
          const Icon = layout.icon;
          return (
            <button
              key={layout.id}
              onClick={() => update({ layout: layout.id })}
              className={`relative rounded-xl border px-4 py-6 text-center ${
                selected ? "border-blue-500 bg-blue-50" : "border-blue-100 bg-white"
              }`}
            >
              {selected && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <Icon
                className={`mx-auto mb-3 h-6 w-6 ${
                  selected ? "text-blue-700" : "text-slate-400"
                }`}
              />
              <p className={`text-sm font-semibold ${selected ? "text-blue-700" : "text-slate-800"}`}>
                {layout.title}
              </p>
              <p className="mt-1 text-xs text-slate-400">{layout.description}</p>
            </button>
          );
        })}
      </div>

      <p className="mt-8 mb-3 text-sm font-semibold text-slate-700">Color Theme</p>
      <div className="grid grid-cols-4 gap-4">
        {COLOR_THEMES.map((theme) => {
          const selected = data.colorTheme === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => update({ colorTheme: theme.id })}
              className="relative rounded-xl border border-blue-100 bg-white p-3"
            >
              {selected && (
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-lime-400 text-white ring-2 ring-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <div
                className="flex h-14 items-center justify-center rounded-lg"
                style={{ backgroundColor: theme.panelBg, border: "1px solid #E5E7EB" }}
              >
                <span
                  className="h-4 w-4 rounded-sm"
                  style={{ backgroundColor: theme.swatch, borderRadius: theme.id === "corporate" ? 4 : 9999 }}
                />
              </div>
              <p
                className={`mt-2 text-sm font-semibold ${
                  selected ? "text-blue-600" : "text-slate-700"
                }`}
              >
                {theme.label}
              </p>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-500">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button
          onClick={onGenerate}
          disabled={generating}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Sparkles className="h-4 w-4" />
          {generating ? "Generating..." : "Generate My Page"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wizard shell                                                       */
/* ------------------------------------------------------------------ */

function CreatePageWizard({
  onClose,
  onComplete,
}: {
  onClose: () => void;
  onComplete: (page: GoPage) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [data, setData] = useState<WizardData>(DEFAULT_WIZARD_DATA);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [godialLists, setGodialLists] = useState<string[]>([]);

  useEffect(() => {
    void api.getContactLists().then((lists) => {
      const names = (Array.isArray(lists) ? lists : []).map((list: { name?: string }) => list.name).filter((name): name is string => Boolean(name));
      setGodialLists(names);
      if (!data.godialList && names[0]) update({ godialList: names[0] });
    }).catch((error: any) => toast.error(error?.message || "Could not load GoDial lists"));
  }, []);

  const update = (patch: Partial<WizardData>) => setData((prev) => ({ ...prev, ...patch }));

  const handleAnalyze = async () => {
    try {
      setAnalyzing(true);
      const result = await api.analyzeGoPage({ name: data.name, websiteUrl: data.websiteUrl, offeringType: data.offeringType });
      if (!data.description.trim() && result?.summary) update({ description: result.summary });
      setStep(2);
    } catch (error: any) {
      toast.error(error?.message || "Could not analyze this page");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const page = await api.createGoPage(data);
      onComplete(page as GoPage);
      toast.success("Go Page generated");
    } catch (error: any) {
      toast.error(error?.message || "Could not generate the page");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-10">
      <div className="w-full max-w-3xl overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl">
        <StepIndicator step={step} />

        {step === 1 && (
          <StepBasicInfo data={data} update={update} onNext={handleAnalyze} analyzing={analyzing} godialLists={godialLists} />
        )}
        {step === 2 && (
          <StepFeaturesMedia
            data={data}
            update={update}
            onBack={() => setStep(1)}
            onNext={() => setStep(3)}
          />
        )}
        {step === 3 && (
          <StepLayoutStyle
            data={data}
            update={update}
            onBack={() => setStep(2)}
            onGenerate={handleGenerate}
            generating={generating}
          />
        )}
      </div>

      <button
        onClick={onClose}
        className="fixed right-6 top-6 rounded-full bg-blue-600 p-2 text-white shadow hover:bg-blue-700"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Root page                                                          */
/* ------------------------------------------------------------------ */

export default function GoPage() {
  const [pages, setPages] = useState<GoPage[]>([]);
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    void api.getGoPages().then((result) => setPages(Array.isArray(result) ? result : [])).catch((error: any) => toast.error(error?.message || "Could not load Go Pages"));
  }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.deleteGoPage(id);
      setPages((prev) => prev.filter((p) => p.id !== id));
      toast.success("Go Page deleted");
    } catch (error: any) {
      toast.error(error?.message || "Could not delete Go Page");
    }
  };
  const handleEdit = (_id: string) => setWizardOpen(true);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fbff_42%,#ffffff_100%)] px-6 py-6">
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => setWizardOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          CREATE PAGE
        </button>
      </div>

      <div className="flex flex-wrap gap-6">
        {pages.map((page) => (
          <PageCard key={page.id} page={page} onEdit={handleEdit} onDelete={handleDelete} />
        ))}
      </div>

      {wizardOpen && (
        <CreatePageWizard
          onClose={() => setWizardOpen(false)}
          onComplete={(page) => {
            setPages((prev) => [page, ...prev]);
            setWizardOpen(false);
          }}
        />
      )}
    </div>
  );
}