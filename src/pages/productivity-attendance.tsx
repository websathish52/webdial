import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CalendarCheck,
  Users,
  Download,
  Clock,
  CalendarDays,
  UserRound,
  Camera,
  Filter,
  Search,
  LayoutGrid,
  Lock,
  UserCheck,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

type Member = {
  id: string;
  _id?: string;
  name: string;
  initial: string;
  attendanceEnabled: boolean;
  flags?: { markAttendance?: boolean; captureLocation?: boolean; capturePhoto?: boolean; enableSessionLock?: boolean };
};

const days = ["WED, 02 SEP", "TUE, 01 SEP", "MON, 31 AUG", "SUN, 30 AUG", "SAT, 29 AUG", "FRI, 28 AUG", "THU, 27 AUG"];

type Permissions = {
  markAttendance: boolean;
  captureLocation: boolean;
  capturePhoto: boolean;
  sessionLock: boolean;
};

const defaultPermissions: Permissions = {
  markAttendance: false,
  captureLocation: false,
  capturePhoto: false,
  sessionLock: false,
};

export default function ProductivityAttendancePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [activeMember, setActiveMember] = useState<Member | null>(null);
  const [permissions, setPermissions] = useState<Permissions>(defaultPermissions);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMembers().then((items: any[]) => setMembers((Array.isArray(items) ? items : []).map((item) => ({ id: item._id || item.id, name: item.name || item.email || "Member", initial: (item.name || item.email || "M").charAt(0).toUpperCase(), attendanceEnabled: Boolean(item.flags?.markAttendance), flags: item.flags })))).catch((err: any) => toast.error(err?.message || "Could not load attendance members")).finally(() => setLoading(false));
  }, []);

  const openPermissions = (member: Member) => {
    setActiveMember(member);
    setPermissions({ markAttendance: Boolean(member.flags?.markAttendance), captureLocation: Boolean(member.flags?.captureLocation), capturePhoto: Boolean(member.flags?.capturePhoto), sessionLock: Boolean(member.flags?.enableSessionLock) });
  };

  const savePermissions = async () => {
    if (!activeMember) return;
    try {
      setSaving(true);
      const updated = await api.updateMember(activeMember.id, { flags: { markAttendance: permissions.markAttendance, captureLocation: permissions.captureLocation, capturePhoto: permissions.capturePhoto, enableSessionLock: permissions.sessionLock } });
      setMembers((prev) => prev.map((item) => item.id === activeMember.id ? { ...item, attendanceEnabled: permissions.markAttendance, flags: updated.flags } : item));
      toast.success("Attendance permissions saved"); setActiveMember(null);
    } catch (err: any) { toast.error(err?.message || "Could not save attendance permissions"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading attendance data...</div>;
  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="rounded-2xl bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] p-6 text-white shadow-lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
              <CalendarCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Attendance Reports</h1>
              <p className="text-sm text-white/85">Track team attendance and work hours</p>
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
              <Users className="h-3.5 w-3.5" /> Team Tracking
            </button>
            <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <Clock className="h-3.5 w-3.5" /> Check-in/Check-out
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <CalendarDays className="h-3.5 w-3.5" /> Date Range
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <UserRound className="h-3.5 w-3.5" /> Member Filter
          </button>
          <button className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium hover:bg-white/25">
            <Camera className="h-3.5 w-3.5" /> Photo Verification
          </button>
        </div>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl border-t-4 border-t-blue-600">
        <div className="flex flex-wrap items-end justify-between gap-3 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-2 pb-2 text-sm font-semibold">
              <Filter className="h-4 w-4 text-blue-600" /> Filters
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Members</span>
              <Select defaultValue="all">
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Date Range</span>
              <button className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                27 Aug – 02 Sep
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="gap-1.5 border-blue-600 text-blue-700 hover:bg-blue-50">
              <Search className="h-4 w-4" /> Search
            </Button>
            <Button className="gap-1.5 bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card className="overflow-hidden rounded-2xl">
        <div className="h-1 w-full bg-blue-600" />
        <div className="flex items-center gap-2 border-b p-4 text-sm font-semibold">
          <LayoutGrid className="h-4 w-4 text-blue-600" /> Attendance Data
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <th className="px-4 py-3 text-left font-medium">Members</th>
                {days.map((d) => (
                  <th key={d} className="px-4 py-3 text-center font-medium">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b last:border-b-0">
                  <td className="px-4 py-4 align-top">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                        {member.initial}
                      </div>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </td>
                  <td colSpan={days.length} className="px-4 py-4">
                    <div className="flex items-center justify-between gap-4 rounded-lg border border-dashed border-blue-300 bg-blue-50/60 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-blue-700" />
                        <div>
                          <p className="text-sm font-semibold text-blue-700">
                            {member.attendanceEnabled ? "Attendance permission on" : "Attendance permission off"}
                          </p>
                          <p className="text-xs text-muted-foreground">Click to {member.attendanceEnabled ? "manage" : "enable"} for {member.name}</p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => openPermissions(member)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {member.attendanceEnabled ? "Manage" : "Enable"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
          <span>Rows per page: 5</span>
          <span>1/1 of {members.length}</span>
        </div>
      </Card>

      {/* Attendance Permissions modal */}
      <Dialog open={!!activeMember} onOpenChange={(open) => !open && setActiveMember(null)}>
        <DialogContent className="max-w-md overflow-hidden p-0">
          <div className="flex flex-col items-center gap-2 bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] px-6 py-6 text-white">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="space-y-4 p-6">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle>Attendance Permissions</DialogTitle>
              <DialogDescription>
                Configure attendance settings for <span className="font-medium text-foreground">{activeMember?.name}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-1">
              {[
                { key: "markAttendance" as const, title: "Mark Attendance", description: "Allow check-in and check-out" },
                { key: "captureLocation" as const, title: "Capture Location", description: "Record GPS at check-in/out" },
                { key: "capturePhoto" as const, title: "Capture Photo", description: "Take a selfie at check-in" },
                { key: "sessionLock" as const, title: "Enable Session Lock", description: "Lock app outside session hours" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between gap-4 rounded-lg px-1 py-3">
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch
                    checked={permissions[item.key]}
                    onCheckedChange={(checked) => setPermissions((prev) => ({ ...prev, [item.key]: checked }))}
                  />
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-2 border-t px-6 py-4 sm:justify-between">
            <Button variant="ghost" onClick={() => setActiveMember(null)}>
              Cancel
            </Button>
            <Button onClick={() => void savePermissions()} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}