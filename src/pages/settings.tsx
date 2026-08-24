import { Link } from "react-router-dom";
import {
  User,
  Lock,
  Grid3x3,
  RefreshCw,
  Minus,
  MessageSquare,
  Cloud,
  ChevronRight,
  Sun,
  Settings,
  Settings as SettingsIcon,
  RotateCw,
} from "lucide-react";
import webdialLogo from "@/assets/webdial-jpg.png";

const BRAND = "#4285F4";

const items = [
  { to: "/settings/general", label: "General", icon: User },
  { to: "/settings/change-password", label: "Change Password", icon: Lock },
  { to: "/settings/default-dialer", label: "Default Dialer", icon: Grid3x3 },
  { to: "/settings/custom-status", label: "Custom Status / Disposition", icon: RefreshCw },
  // { to: "/settings/custom-fields", label: "Custom Fields", icon: Minus },
  { to: "/settings/message-templates", label: "Message Templates", icon: MessageSquare },
  { to: "/settings/storage", label: "Storage", icon: Cloud },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen ">
      {/* Top bar */}
     

         <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg max-w-[1400px] mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><Settings className="size-7"/> Settings</h1>
            <p className="opacity-90 mt-1 text-sm">Manage your organization and account settings</p>
          </div>
          <div className="hidden sm:flex gap-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">General</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Security</span>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold">Preferences</span>
          </div>
        </div>
      </div>

      <div className=" max-w-[1400px] mx-auto mt-5 pt-4">
        <div className="bg-white rounded-xl shadow-sm p-10">
          <div className="flex flex-col items-center mb-10">
            <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg overflow-hidden">
              <img src={webdialLogo} alt="Web Dial Logo" className="w-full h-auto object-cover" />
            </div>
            {/* <p className="mt-4 text-gray-800 font-medium">Web Dial</p> */}
          </div>

          <div className="divide-y">
            {items.map(({ to, label, icon: Icon }) => (
              <Link
                to={to}
                key={to}
                className="flex items-center justify-between py-4 px-2 hover:bg-gray-50 transition"
              >
                <div className="flex items-center gap-4">
                  <Icon className="w-5 h-5 text-gray-500" />
                  <span className="text-gray-800">{label}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
