import { useState, useEffect } from "react";
import { Phone, MessageCircle, MessageSquare, Star, Plug, Settings2, CheckCircle2 } from "lucide-react";
import { BRAND, HeroBanner, SettingsTopBar } from "./_shared";
import api from "@/lib/api"; // Assuming api.ts exists
import { toast } from "sonner"; // Assuming sonner for toasts

const dialers = [
  "Phone Dialer", "FaceTime", "Vonage", "Bria", "Fiverr MobileVOIP", "Truecaller",
  "Skype", "Google Hangouts", "Magic Jack", "Zoiper", "Line", "Viber",
  "2ndLine", "Satellite", "Knowlarity", "Exotel", "Telecmi",
];

// Assuming a type for dialer settings
type DialerSettings = {
  selectedDialer: string;
};

export default function DefaultDialerPage() {
  const [selected, setSelected] = useState("Phone Dialer");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDialerSettings = async () => {
      try {
        setLoading(true);
        const res = await api.getDialerSettings(); // Assumed API call
        if (res?.selectedDialer) setSelected(res.selectedDialer);
      } catch (err: any) {
        toast.error(err?.message || "Failed to load dialer settings");
      } finally {
        setLoading(false);
      }
    };
    void loadDialerSettings();
  }, []);

  const handleSetDefaultDialer = async () => {
    try {
      await api.updateDialerSettings(selected); // Assumed API call
      toast.success("Default dialer updated");
    } catch (err: any) {
      toast.error(err?.message || "Failed to update default dialer");
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <SettingsTopBar title="Set Default Dialer" />
        <div className="space-y-6 max-w-[1400px] mx-auto">Loading dialer settings...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <SettingsTopBar title="Set Default Dialer" />
      <div className="space-y-6 max-w-[1400px] mx-auto">
       

        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-gray-900">Select Dialer Application</h3>
            <p className="text-sm text-gray-500">
              Web Dial allows you to place calls via your phone's dialer or from any of the following apps
            </p>
          </div>

          <div className="divide-y border-t border-b">
            {dialers.map((name) => {
              const active = selected === name;
              return (
                <button
                  key={name}
                  onClick={() => setSelected(name)}
                  className="w-full flex items-center justify-between py-3 px-3 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-gray-100 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-gray-500" />
                    </div>
                    <span className="text-sm text-gray-800">{name}</span>
                  </div>
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: active ? BRAND : "#d1d5db", backgroundColor: active ? BRAND : "transparent" }}
                  >
                    {active && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </div>
                </button>
              );
            })}
          </div>

          <button
            className="mt-6 w-full py-3 rounded-md text-white font-semibold flex items-center justify-center gap-2"
            style={{ backgroundColor: BRAND }}
            onClick={handleSetDefaultDialer}
          >
            <CheckCircle2 className="w-4 h-4" /> SET DEFAULT DIALER
          </button>
        </div>
      </div>
    </div>
  );
}
