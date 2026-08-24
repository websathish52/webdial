import { ArrowLeft, Sun, Settings as SettingsIcon, RotateCw, X, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

export const BRAND = "#4285F4";
export const BRAND_DARK = "#4285F4";

export function SettingsTopBar({ title }: { title: string }) {
  const navigate = useNavigate();
  return (
    <div className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg max-w-[1400px] mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2"><SettingsIcon className="size-7"/> {title}</h1>
          <p className="opacity-90 mt-1 text-sm">Manage your organization and account settings</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <button onClick={() => navigate(-1)} className="bg-white/20 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
            <ArrowLeft className="size-3.5"/> Back
          </button>
        </div>
      </div>
    </div>
  );
}

export function HeroBanner({
  icon,
  title,
  subtitle,
  tabs,
  badges,
  actions,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  tabs: { icon: ReactNode; label: string }[];
  badges?: { label: string; icon?: ReactNode }[];
  actions?: ReactNode;
}) {
  return (
    <div
      className="bg-[linear-gradient(135deg,#1D4ED8_0%,#2563EB_50%,#60A5FA_100%)] rounded-2xl p-6 text-white shadow-lg  mx-auto"
    >
      <Link to="/settings" className="absolute top-4 right-4 text-white/90 hover:text-white">
        <X className="w-5 h-5" />
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            <p className="text-sm text-white/90">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {badges?.map((b, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/40 text-xs bg-white/10"
            >
              {b.icon}
              {b.label}
            </span>
          ))}
          {actions}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {tabs.map((t, i) => (
          <div
            key={i}
            className="flex min-w-[140px] flex-1 items-center gap-2 rounded-md border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-medium sm:min-w-[160px]"
          >
            {t.icon}
            <span className="truncate">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
