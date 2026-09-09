import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import Dashboard_Navbar from "./Admin_Navbar";
import Doctor_Side_Bar from "./SideBar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Cpu } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";

const SiteSettings = () => {
  const [side, setSide] = useState(false);
  const { admin } = useAdminAuth();

  const [aiCoachEnabled, setAiCoachEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const baseURL = import.meta.env.VITE_BASE_URL;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await axios.get(`${baseURL}/api/settings`);
        if (data.success) {
          setAiCoachEnabled(data.data.aiCoachEnabled);
        }
      } catch (err) {
        console.error("Failed to load site settings:", err);
        toast.error("Kon instellingen niet laden.");
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [baseURL]);

  const handleToggle = async (checked) => {
    const previous = aiCoachEnabled;
    setAiCoachEnabled(checked); // optimistic
    setSaving(true);
    try {
      const { data } = await axios.put(
        `${baseURL}/api/settings`,
        { aiCoachEnabled: checked },
        { headers: { Authorization: `Bearer ${admin?.token}` } }
      );
      if (data.success) {
        toast.success(
          checked ? "AI Coach is nu zichtbaar op de website." : "AI Coach is nu verborgen op de website."
        );
      } else {
        throw new Error(data.message || "Opslaan mislukt");
      }
    } catch (err) {
      console.error("Failed to update site settings:", err);
      toast.error(err.response?.data?.message || "Instellingen bijwerken is mislukt.");
      setAiCoachEnabled(previous); // revert on failure
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Dashboard_Navbar side={side} setSide={setSide} user={admin} />
      <div className="dashboard-wrapper">
        <Doctor_Side_Bar side={side} setSide={setSide} user={admin} />
        <div className="dashboard-side min-h-screen p-6">
          <h1 className="text-2xl font-bold mb-6">Site-instellingen</h1>

          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                AI Coach zichtbaarheid
              </CardTitle>
              <CardDescription>
                Bepaal of de AI Coach (het AI-gedreven advies, zoals de "AI-Powered" badge op de
                homepage) zichtbaar is voor bezoekers van de website. De onderliggende AI Coach
                data blijft bestaan — dit schakelt alleen de weergave op de site aan of uit.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Laden...
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">AI Coach tonen op de website</p>
                    <p className="text-sm text-gray-500">
                      {aiCoachEnabled ? "Momenteel zichtbaar voor bezoekers." : "Momenteel verborgen voor bezoekers."}
                    </p>
                  </div>
                  <Switch checked={aiCoachEnabled} onCheckedChange={handleToggle} disabled={saving} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SiteSettings;
