import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Megaphone,
  PhoneCall,
  BarChart3,
  UserRoundX,
  Settings2,
  FileBarChart,
  Upload,
  FileAudio,
  X,
} from "lucide-react";

type CampaignReport = { id: string; name: string; list: string; total: number; status: string; createdAt: string };

type List = { id: string; name: string; count: number };

export default function VoiceBroadcastPage() {
  const [activeTab, setActiveTab] = useState<"settings" | "reports">("settings");
  const [maintenanceMode, setMaintenanceMode] = useState(true);

  const [lists, setLists] = useState<List[]>([]);
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [campaignName, setCampaignName] = useState("");
  const [captureInput, setCaptureInput] = useState(false);
  const [listId, setListId] = useState("");
  const [contentType, setContentType] = useState<"audio" | "text">("audio");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [textContent, setTextContent] = useState("");
  const [agreed, setAgreed] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          api.getContactLists(),
          api.getVoiceBroadcastStatus(),
          api.getVoiceBroadcastCampaigns(),
        ]);
        const listsResult = results[0];
        const statusResult = results[1];
        const reportsResult = results[2];

        const availableLists = listsResult.status === "fulfilled" && Array.isArray(listsResult.value) ? listsResult.value : [];
        setLists(availableLists);
        if (availableLists.length) setListId(availableLists[0].id);

        if (statusResult.status === "fulfilled" && typeof statusResult.value?.maintenance === "boolean") {
          setMaintenanceMode(statusResult.value.maintenance);
        }

        setReports(reportsResult.status === "fulfilled" && Array.isArray(reportsResult.value) ? reportsResult.value : []);
      } catch (error: any) {
        toast.error(error?.message || "Could not load voice broadcast data");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const selectedList = lists.find((l) => l.id === listId);

  const saveCampaign = async () => {
    if (!campaignName.trim() || !listId || !agreed) return;
    try {
      setSaving(true);
      let audioUrl = "";
      if (contentType === "audio" && audioFile) {
        const uploadData = new FormData();
        uploadData.append("file", audioFile);
        uploadData.append("purpose", "voice-broadcast");
        const uploaded = await api.uploadFile(uploadData);
        audioUrl = uploaded?.file?.url || uploaded?.file?.path || "";
      }
      await api.createVoiceBroadcastCampaign({
        name: campaignName,
        listId,
        captureInput,
        contentType,
        text: contentType === "text" ? textContent : undefined,
        audioUrl,
      });
      toast.success("Campaign saved");
      setCampaignName("");
      setAudioFile(null);
      setTextContent("");
      setAgreed(false);
    } catch (error: any) {
      toast.error(error?.message || "Could not save the campaign");
    } finally {
      setSaving(false);
    }
  };

  const canSave = !maintenanceMode && campaignName.trim() && listId && agreed && (contentType === "text" ? textContent.trim() : audioFile);

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading voice broadcast...</div>;

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Voice Broadcast Campaign</h1>
              <p className="text-sm text-white/85">Create and manage voice broadcast campaigns</p>
            </div>
          </div>

          <div className="flex gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              <PhoneCall className="h-3.5 w-3.5" /> Bulk Calling
            </span>
            <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              <BarChart3 className="h-3.5 w-3.5" /> Analytics
            </span>
          </div>
        </div>
      </div>

      {maintenanceMode && (
        <div className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <UserRoundX className="h-5 w-5 shrink-0" />
          Our voice broadcast service is currently undergoing maintenance to implement the new TRAI guidelines. We
          will have it up and running again as soon as the process is complete.
        </div>
      )}

      {/* Tabs + content */}
      <Card className="rounded-2xl">
        <div className="flex gap-8 border-b px-5">
          <button
            onClick={() => setActiveTab("settings")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold uppercase tracking-wide ${
              activeTab === "settings" ? "border-blue-600 text-blue-700" : "border-transparent text-muted-foreground"
            }`}
          >
            <Settings2 className="h-3.5 w-3.5" /> Campaign Settings
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex items-center gap-1.5 border-b-2 py-3 text-xs font-semibold uppercase tracking-wide ${
              activeTab === "reports" ? "border-blue-600 text-blue-700" : "border-transparent text-muted-foreground"
            }`}
          >
            <FileBarChart className="h-3.5 w-3.5" /> Reports
          </button>
        </div>

        {activeTab === "settings" ? (
          <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto]">
            <div className="space-y-5">
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Campaign Name</span>
                <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Choose List</span>
                <Select value={listId} onValueChange={setListId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a list" />
                  </SelectTrigger>
                  <SelectContent>
                    {lists.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedList && (
                  <p className="text-sm text-blue-700">
                    Total <span className="font-medium">number of contacts</span> : {selectedList.count}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Broadcast Content</span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="content-type"
                      checked={contentType === "audio"}
                      onChange={() => setContentType("audio")}
                      className="h-4 w-4 accent-blue-600"
                    />
                    Audio
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="content-type"
                      checked={contentType === "text"}
                      onChange={() => setContentType("text")}
                      className="h-4 w-4 accent-blue-600"
                    />
                    Text
                  </label>
                </div>
              </div>

              {contentType === "audio" ? (
                audioFile ? (
                  <div className="flex items-center justify-between rounded-lg border border-blue-300 bg-blue-50 px-4 py-3">
                    <span className="flex items-center gap-2 text-sm text-blue-700">
                      <FileAudio className="h-4 w-4" /> {audioFile.name}
                    </span>
                    <button onClick={() => setAudioFile(null)} className="text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-blue-500 py-2.5 text-sm font-semibold uppercase text-blue-700 hover:bg-blue-50">
                    <Upload className="h-4 w-4" /> Click to upload audio file
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => setAudioFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )
              ) : (
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter the text to convert to speech..."
                  rows={4}
                />
              )}

              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-1 h-4 w-4 accent-blue-600"
                />
                I agree to the terms and conditions of webdial and understand that if the contacts in the selected
                list raise any complaint including DND or Legal, I will be held responsible, and TRAI or other
                authorities may take necessary action against me.
              </label>

              <Button
                onClick={() => void saveCampaign()}
                disabled={!canSave || saving}
                className="gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Campaign"}
              </Button>
              {maintenanceMode && (
                <p className="text-xs text-muted-foreground">
                  Campaign creation is paused while the broadcast service is under maintenance.
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 pt-1">
              <Switch checked={captureInput} onCheckedChange={setCaptureInput} />
              <span className="text-sm">Capture Input</span>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto p-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3 text-left">Campaign</th>
                  <th className="px-4 py-3 text-left">List</th>
                  <th className="px-4 py-3 text-left">Contacts</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {reports.length ? (
                  reports.map((r) => (
                    <tr key={r.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">{r.name}</td>
                      <td className="px-4 py-3">{r.list}</td>
                      <td className="px-4 py-3">{r.total}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.createdAt}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No campaigns yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}