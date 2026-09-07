import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  SlidersHorizontal,
  Grip,
  Settings2,
  ListChecks,
  Eye,
  Plus,
  Copy,
  Trash2,
  X,
  ChevronDown,
  AlignLeft,
  Circle,
  CheckSquare,
  Calendar,
  Clock,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type QuestionType = "short" | "multiple" | "checkbox" | "dropdown" | "date" | "time";

type Question = {
  id: string;
  text: string;
  type: QuestionType;
  options: string[];
  required: boolean;
};

type TabKey = "questions" | "settings" | "response";

type ResponseRow = { id: string; submittedAt: string; summary: string };

const typeMeta: Record<QuestionType, { label: string; icon: typeof AlignLeft }> = {
  short: { label: "Short answer", icon: AlignLeft },
  multiple: { label: "Multiple Choice", icon: Circle },
  checkbox: { label: "Checkbox", icon: CheckSquare },
  dropdown: { label: "Dropdown", icon: ChevronDown },
  date: { label: "Date", icon: Calendar },
  time: { label: "Time", icon: Clock },
};

const newQuestion = (): Question => ({
  id: crypto.randomUUID(),
  text: "",
  type: "multiple",
  options: ["Option 1"],
  required: false,
});

const lists = ["Default", "Hot Leads", "Follow-up", "Cold Leads"];

/* ------------------------------------------------------------------ */
/* Question type picker (matches the popover in the screenshot)        */
/* ------------------------------------------------------------------ */

function TypePicker({ value, onChange }: { value: QuestionType; onChange: (type: QuestionType) => void }) {
  const [open, setOpen] = useState(false);
  const Selected = typeMeta[value].icon;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
      >
        <Selected className="h-4 w-4 text-blue-600" />
        {typeMeta[value].label}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-[99998]" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-[99999] mt-1 w-56 rounded-lg border bg-background shadow-lg">
            {(Object.keys(typeMeta) as QuestionType[]).map((key) => {
              const Icon = typeMeta[key].icon;
              const active = key === value;
              return (
                <button
                  key={key}
                  onClick={() => {
                    onChange(key);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm ${
                    active ? "bg-blue-50 font-medium text-blue-700" : "hover:bg-muted/60"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {typeMeta[key].label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Question card                                                       */
/* ------------------------------------------------------------------ */

function QuestionCard({
  question,
  onUpdate,
  onDuplicate,
  onDelete,
  onAddNext,
  dragHandlers,
}: {
  question: Question;
  onUpdate: (patch: Partial<Question>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAddNext: () => void;
  dragHandlers: {
    draggable: boolean;
    onDragStart: () => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: () => void;
  };
}) {
  const showOptions = question.type === "multiple" || question.type === "checkbox" || question.type === "dropdown";

  const updateOption = (index: number, value: string) => {
    const options = [...question.options];
    options[index] = value;
    onUpdate({ options });
  };
  const addOption = () => onUpdate({ options: [...question.options, `Option ${question.options.length + 1}`] });
  const removeOption = (index: number) => onUpdate({ options: question.options.filter((_, i) => i !== index) });

  return (
    <div
      onDragOver={dragHandlers.onDragOver}
      onDrop={dragHandlers.onDrop}
      className="overflow-hidden rounded-xl border shadow-sm"
    >
      <div
        draggable={dragHandlers.draggable}
        onDragStart={dragHandlers.onDragStart}
        className="flex cursor-grab items-center justify-center bg-blue-600 py-1.5 active:cursor-grabbing"
      >
        <Grip className="h-3.5 w-3.5 text-white/70" />
      </div>

      <div className="space-y-4 bg-background p-5">
        <div className="flex items-center gap-3">
          <Input
            value={question.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            placeholder="Question"
            className="border-0 border-b border-input px-0 text-base shadow-none focus-visible:ring-0"
          />
          <TypePicker value={question.type} onChange={(type) => onUpdate({ type })} />
        </div>

        {showOptions && (
          <div className="space-y-2">
            {question.options.map((option, i) => (
              <div key={i} className="flex items-center gap-3">
                <div
                  className={
                    question.type === "checkbox"
                      ? "h-4 w-4 rounded border border-muted-foreground/40"
                      : "h-4 w-4 rounded-full border border-muted-foreground/40"
                  }
                />
                <Input
                  value={option}
                  onChange={(e) => updateOption(i, e.target.value)}
                  className="border-0 border-b border-input px-0 shadow-none focus-visible:ring-0"
                />
                {question.options.length > 1 && (
                  <button onClick={() => removeOption(i)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-3">
              <div
                className={
                  question.type === "checkbox"
                    ? "h-4 w-4 rounded border border-muted-foreground/40"
                    : "h-4 w-4 rounded-full border border-muted-foreground/40"
                }
              />
              <button onClick={addOption} className="text-sm text-muted-foreground">
                Add
              </button>
              <button
                onClick={addOption}
                className="rounded-md bg-lime-500 px-2.5 py-1 text-xs font-semibold uppercase text-white hover:bg-lime-600"
              >
                Option
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-4 border-t pt-3">
          <button onClick={onAddNext} className="text-muted-foreground hover:text-foreground" title="Add question">
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={onDuplicate} className="text-muted-foreground hover:text-foreground" title="Duplicate">
            <Copy className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="text-muted-foreground hover:text-red-600" title="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
          <div className="mx-2 h-5 w-px bg-border" />
          <span className="text-sm">Required</span>
          <Switch checked={question.required} onCheckedChange={(checked) => onUpdate({ required: checked })} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main page                                                           */
/* ------------------------------------------------------------------ */

export default function FormPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("questions");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formTitle, setFormTitle] = useState("Untitled form");
  const [formDescription, setFormDescription] = useState("");
  const [questions, setQuestions] = useState<Question[]>([newQuestion()]);

  const [requireByDefault, setRequireByDefault] = useState(false);
  const [listAssigned, setListAssigned] = useState<string>("");

  const [formActive, setFormActive] = useState(false);
  const [responses, setResponses] = useState<ResponseRow[]>([]);

  const dragIndex = useState<{ current: number | null }>({ current: null })[0];

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.getForm();
        if (data) {
          setFormTitle(data.title ?? "Untitled form");
          setFormDescription(data.description ?? "");
          setQuestions(Array.isArray(data.questions) && data.questions.length ? data.questions : [newQuestion()]);
          setRequireByDefault(Boolean(data.requireByDefault));
          setListAssigned(data.listAssigned ?? "");
          setFormActive(Boolean(data.active));
          setResponses(Array.isArray(data.responses) ? data.responses : []);
        }
      } catch (error: any) {
        toast.error(error?.message || "Could not load the form");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const saveForm = async () => {
    try {
      setSaving(true);
      await api.saveForm({ title: formTitle, description: formDescription, questions });
      toast.success("Form saved");
    } catch (error: any) {
      toast.error(error?.message || "Could not save the form");
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await api.updateFormSettings({ requireByDefault, listAssigned });
      toast.success("Settings saved");
    } catch (error: any) {
      toast.error(error?.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const updateQuestion = (id: string, patch: Partial<Question>) =>
    setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...patch } : q)));

  const duplicateQuestion = (id: string) =>
    setQuestions((prev) => {
      const index = prev.findIndex((q) => q.id === id);
      if (index === -1) return prev;
      const copy = { ...prev[index], id: crypto.randomUUID() };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });

  const deleteQuestion = (id: string) =>
    setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.id !== id) : prev));

  const addQuestionAfter = (id: string) =>
    setQuestions((prev) => {
      const index = prev.findIndex((q) => q.id === id);
      const q = newQuestion();
      return [...prev.slice(0, index + 1), q, ...prev.slice(index + 1)];
    });

  const reorder = (from: number, to: number) =>
    setQuestions((prev) => {
      if (from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading form builder...</div>;

  return (
    <div className="space-y-0 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] p-6 text-white shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Create Form</h1>
            <p className="text-sm text-white/85">Build your custom form</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
            <SlidersHorizontal className="h-3.5 w-3.5" /> Form Builder
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
            <Grip className="h-3.5 w-3.5" /> Drag &amp; Drop
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
            <Settings2 className="h-3.5 w-3.5" /> Customizable
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-10 border-b bg-background py-3">
        {[
          { key: "questions" as TabKey, label: "Questions", icon: ListChecks },
          { key: "settings" as TabKey, label: "Settings", icon: Settings2 },
          { key: "response" as TabKey, label: "Response", icon: Eye },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 pb-2 text-sm font-medium ${
                active ? "border-b-2 border-blue-600 text-blue-700" : "text-muted-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* Questions tab */}
      {activeTab === "questions" && (
        <div className="space-y-4 bg-muted/30 p-6">
          <div className="overflow-hidden rounded-xl border shadow-sm">
            <div className="h-1.5 w-full bg-blue-600" />
            <div className="space-y-1 bg-background p-5">
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                className="border-0 px-0 text-2xl font-semibold shadow-none focus-visible:ring-0"
              />
              <Input
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Form Description"
                className="border-0 px-0 text-sm text-muted-foreground shadow-none focus-visible:ring-0"
              />
            </div>
          </div>

          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              onUpdate={(patch) => updateQuestion(question.id, patch)}
              onDuplicate={() => duplicateQuestion(question.id)}
              onDelete={() => deleteQuestion(question.id)}
              onAddNext={() => addQuestionAfter(question.id)}
              dragHandlers={{
                draggable: true,
                onDragStart: () => (dragIndex.current = index),
                onDragOver: (e) => e.preventDefault(),
                onDrop: () => {
                  if (dragIndex.current !== null) reorder(dragIndex.current, index);
                  dragIndex.current = null;
                },
              }}
            />
          ))}

          <div className="flex justify-end">
            <Button onClick={() => void saveForm()} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      )}

      {/* Settings tab */}
      {activeTab === "settings" && (
        <div className="bg-muted/30 p-6">
          <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="border-b px-5 py-4">
              <p className="font-semibold">Settings</p>
            </div>

            <div className="space-y-6 p-5">
              <div>
                <p className="mb-3 text-sm font-medium">Question defaults</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Make questions required by default</span>
                  <Switch checked={requireByDefault} onCheckedChange={setRequireByDefault} />
                </div>
              </div>

              <div className="flex items-center justify-between border-t pt-4">
                <span className="text-sm font-medium">Lists Assigned</span>
                <Select value={listAssigned || undefined} onValueChange={setListAssigned}>
                  <SelectTrigger className="w-[180px] border-0 text-muted-foreground shadow-none">
                    <SelectValue placeholder="No list selected" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end border-t p-4">
              <Button onClick={() => void saveSettings()} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Response tab */}
      {activeTab === "response" && (
        <div className="bg-muted/30 p-6">
          <div className="mx-auto max-w-2xl overflow-hidden rounded-xl border bg-background shadow-sm">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <p className="font-semibold">Responses</p>
              <button
                onClick={() => {
                  const nextActive = !formActive;
                  setFormActive(nextActive);
                  void api.updateFormSettings({ active: nextActive }).then(() => {
                    toast.success(nextActive ? "Form activated" : "Form deactivated");
                  }).catch((error: any) => {
                    setFormActive(formActive);
                    toast.error(error?.message || "Could not update form status");
                  });
                }}
                title={formActive ? "Deactivate form" : "Activate form"}
                className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5">
              {!formActive || !responses.length ? (
                <p className="text-sm text-muted-foreground">
                  {formActive ? "No responses yet." : "The form is not yet Active"}
                </p>
              ) : (
                <div className="space-y-2">
                  {responses.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3 text-sm">
                      <p className="font-medium">{r.summary}</p>
                      <p className="text-xs text-muted-foreground">{r.submittedAt}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}