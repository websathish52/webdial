import { useState, useEffect } from "react";
import { Tag, Plus, MoreVertical, Info, RefreshCw, ListTree, PhoneCall, ArrowUpDown, Trash2, Edit } from "lucide-react";
import { BRAND, HeroBanner, SettingsTopBar } from "./_shared";
import api from "@/lib/api"; // Assuming api.ts exists
import { toast } from "sonner"; // Assuming sonner for toasts

// Assuming a type for custom status
type CustomStatus = {
  key: string; // Unique identifier, e.g., slugified name
  name: string;
  description?: string;
  color: string;
};

export default function CustomStatusPage() {
  const [color, setColor] = useState("#ffffff");
  const [statusName, setStatusName] = useState("");
  const [statusDescription, setStatusDescription] = useState("");
  const [customStatuses, setCustomStatuses] = useState<CustomStatus[]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCustomStatuses = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomStatuses(); // Assumed API call
      setCustomStatuses(Array.isArray(res) ? res : []);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load custom statuses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCustomStatuses(); }, []);

  const handleAddStatus = async () => {
    if (!statusName.trim()) {
      toast.error("Status name cannot be empty.");
      return;
    }
    const newStatusKey = statusName.trim().toLowerCase().replace(/\s+/g, '_');
    if (customStatuses.some(s => s.key === newStatusKey)) {
      toast.error("A status with this name already exists.");
      return;
    }
    try {
      await api.createCustomStatus({ name: statusName.trim(), description: statusDescription.trim(), color }); // Assumed API call
      toast.success("Custom status added.");
      setStatusName("");
      setStatusDescription("");
      setColor("#ffffff");
      void loadCustomStatuses();
    } catch (err: any) {
      toast.error(err?.message || "Failed to add custom status.");
    }
  };

  const handleDeleteStatus = async (key: string) => {
    if (!window.confirm("Are you sure you want to delete this status?")) return;
    try {
      await api.deleteCustomStatus(key); // Assumed API call
      toast.success("Custom status deleted.");
      void loadCustomStatuses();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete custom status.");
    }
  };

  const handleEditStatus = async (status: CustomStatus) => {
    const name = window.prompt("Status name", status.name)?.trim();
    if (!name) return;
    const description = window.prompt("Description", status.description || "") ?? (status.description || "");
    try {
      setEditingKey(status.key);
      await api.updateCustomStatus(status.key, { name, description, color: status.color });
      toast.success("Custom status updated.");
      await loadCustomStatuses();
    } catch (err: any) {
      toast.error(err?.message || "Failed to update custom status.");
    } finally {
      setEditingKey(null);
    }
  };

  const handleColorChange = async (status: CustomStatus, nextColor: string) => {
    try {
      setCustomStatuses(current => current.map(item => item.key === status.key ? { ...item, color: nextColor } : item));
      await api.updateCustomStatus(status.key, { color: nextColor });
    } catch (err: any) {
      toast.error(err?.message || "Failed to update status color.");
      void loadCustomStatuses();
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SettingsTopBar title="Custom Status" />
        <div className="space-y-6 max-w-[1400px] mx-auto">Loading custom statuses...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <SettingsTopBar title="Custom Status" />
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Add new status */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Add New Status</h3>
              <Info className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500">Name Of Status</label> {/* Changed text-red-500 to text-gray-500 */}
                <input className="w-full border rounded-md px-3 py-2 text-sm mt-1" value={statusName} onChange={(e) => setStatusName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Description</label>
                <textarea rows={4} className="w-full border rounded-md px-3 py-2 text-sm mt-1" value={statusDescription} onChange={(e) => setStatusDescription(e.target.value)} />
              </div>
              <div>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-40 rounded border cursor-pointer"
                />
                <div className="mt-2 text-center">
                  <input
                    value={color.toUpperCase()}
                    onChange={(e) => setColor(e.target.value)}
                    className="border rounded px-3 py-1 text-sm text-center"
                  />
                  <div className="text-xs text-gray-500 mt-1">HEX</div>
                </div>
              </div>
              <details className="border rounded-md px-3 py-2 text-sm">
                <summary className="cursor-pointer">Advance Settings</summary>
                <div className="pt-3 text-gray-500">No advanced options yet.</div>
              </details>
              <button
                className="w-full py-3 rounded-md text-white font-semibold flex items-center justify-center gap-2"
                style={{ backgroundColor: BRAND }} onClick={handleAddStatus}
              >
                <Plus className="w-4 h-4" /> ADD
              </button>
            </div>
          </div>

          {/* Status list */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Status List</h3>
            {customStatuses.length === 0 && <div className="text-center text-sm text-muted-foreground py-4">No custom statuses yet.</div>}
            <div className="grid grid-cols-1 gap-3">
              {customStatuses.map((s) => (
                <div key={s.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={s.color || "#6b7280"}
                      onChange={(e) => void handleColorChange(s, e.target.value)}
                      className="w-8 h-8 rounded border cursor-pointer bg-transparent"
                      title={`Change ${s.name} color`}
                    />
                    <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Edit functionality would open a dialog or inline edit */}
                    <button className="text-gray-400 hover:text-blue-500 disabled:opacity-50" onClick={() => void handleEditStatus(s)} disabled={editingKey === s.key} title="Edit Status">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-red-500" onClick={() => handleDeleteStatus(s.key)} title="Delete Status"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
