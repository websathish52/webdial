import { useState, useEffect } from "react";
import { Database, FileText, Activity, Cloud, Building2, HardDrive, BarChart3, UploadCloud, Mail } from "lucide-react"; // This file might not exist, assuming it does from the code. If not, these components need to be created or imported from their actual location.
import { BRAND, HeroBanner, SettingsTopBar } from "./_shared"; // This file might not exist, assuming it does from the code. If not, these components need to be created or imported from their actual location.
import api from "@/lib/api"; // Assuming api.ts exists
import { toast } from "sonner"; // Assuming sonner for toasts

// Assuming a type for storage usage
type StorageUsage = {
  used: number; // in MB
  total: number; // in MB
};

type StoredFile = {
  _id: string;
  originalName: string;
  size?: number;
  createdAt?: string;
  listName?: string;
};

export default function StoragePage() {
  const [storageUsage, setStorageUsage] = useState<StorageUsage>({ used: 0, total: 100 });
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStorageUsage = async () => {
      try {
        setLoading(true);
        const [usage, uploads] = await Promise.all([api.getStorageUsage(), api.getUploads()]);
        if (usage) setStorageUsage(usage);
        setFiles(Array.isArray(uploads) ? uploads : []);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load storage usage");
      } finally {
        setLoading(false);
      }
    };
    void loadStorageUsage();
  }, []);

  const pct = Math.min(100, (storageUsage.used / storageUsage.total) * 100);
  const storageFull = storageUsage.used >= storageUsage.total;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SettingsTopBar title="Storage" />
        <div className="space-y-6 max-w-[1400px] mx-auto">Loading storage data...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <SettingsTopBar title="Storage" />
      <div className="space-y-6 max-w-[1400px] mx-auto">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border-t-4" style={{ borderColor: BRAND }}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5" style={{ color: BRAND }} />
                <h3 className="font-bold text-gray-900">Files</h3>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Total Usage</div>
                <div className={`text-2xl font-bold ${storageFull ? "text-red-600" : "text-gray-900"}`}>{storageUsage.used}MB / {storageUsage.total}MB</div>
                <div className="w-56 h-1.5 rounded-full bg-gray-100 mt-1 overflow-hidden">
                  <div className={`h-full ${storageFull ? "bg-red-600" : ""}`} style={{ width: `${pct}%`, backgroundColor: storageFull ? undefined : BRAND }} />
                </div>
                {storageFull && <div className="mt-2 text-xs font-semibold text-red-600">Storage full. Upload and import are disabled.</div>}
              </div>
            </div>

            <div className="grid grid-cols-4 py-3 border-b text-xs font-semibold text-gray-500 uppercase">
              <span>File Name</span>
              <span>Size</span>
              <span>Time</span>
              <span>Category</span>
            </div>
            {files.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">No data available</div>
            ) : (
              files.map((file) => (
                <div key={file._id} className="grid grid-cols-4 py-3 border-b text-sm text-gray-700">
                  <span className="truncate pr-3">{file.originalName}</span>
                  <span>{((file.size || 0) / 1024 / 1024).toFixed(2)} MB</span>
                  <span>{file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "-"}</span>
                  <span className="truncate">{file.listName || "General"}</span>
                </div>
              ))
            )}

            <div className="flex items-center justify-between text-xs text-gray-500 pt-4 border-t">
              <div className="flex items-center gap-2">
                Rows per page:
                <select className="border rounded px-2 py-0.5"><option>5</option></select>
              </div>
              <span>{files.length ? `1/${files.length} of ${files.length}` : "1/0 of 0"}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-t-4 p-8 text-center" style={{ borderColor: BRAND }}>
          <div className="flex items-center gap-2 justify-start mb-6">
            <Database className="w-5 h-5" style={{ color: BRAND }} />
            <h3 className="font-bold text-gray-900">Upgrade Storage</h3>
          </div>
          <UploadCloud className="w-16 h-16 mx-auto text-gray-300" />
          <p className="text-gray-800 mt-4">Need more storage space?</p>
          <p className="text-gray-500 text-sm">Please contact us at support@WebDial.cc</p>
          <button
            className="mt-4 inline-flex items-center gap-2 px-6 py-2.5 rounded-md text-white font-semibold"
            style={{ backgroundColor: BRAND }}
          >
            <Mail className="w-4 h-4" /> CONTACT US
          </button>
        </div>
      </div>
    </div>
  );
}
