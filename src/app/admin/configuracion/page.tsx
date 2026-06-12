"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import { validateGeneral } from "./lib";
import SettingsHeader from "./components/SettingsHeader";
import TabsSidebar from "./components/TabsSidebar";
import GeneralSection from "./components/GeneralSection";
import AppearanceSection from "./components/AppearanceSection";
import ShippingSection from "./components/ShippingSection";
import PaymentSection from "./components/PaymentSection";
import EmailSection from "./components/EmailSection";
import SocialSection from "./components/SocialSection";
import SeoSection from "./components/SeoSection";
import PolicySection from "./components/PolicySection";
import SaveActions from "./components/SaveActions";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [settings, setSettings] = useState<StoreSettings>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { data: session } = useSession();

  const isAdmin = useMemo(() => {
    const role = (session as any)?.role || (session?.user as any)?.role || "";
    return String(role).toUpperCase().includes("ADMIN");
  }, [session]);

  // Cargar configuraciones
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoadingSettings(true);
      setError(null);
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        setError("Error al cargar configuraciones");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingSettings(false);
    }
  };

  const handleChange = (path: string[], value: any) => {
    setSettings((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) current[path[i]] = {};
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings();
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      // Validar antes de enviar
      if (activeTab === "general") {
        const v = validateGeneral(settings);
        if (v.length) {
          setError(v.join(" "));
          setIsSaving(false);
          return;
        }
      }
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (res.ok) {
        setShowSuccess(true);
        setError(null);
        // Notificar a la aplicación que las settings fueron actualizadas
        if (typeof window !== "undefined") {
          try {
            window.dispatchEvent(new CustomEvent("settings:updated"));
          } catch {
            // ignore
          }
        }
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const json = await res.json().catch(() => ({}));
        setError(json.error || res.statusText);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Encabezado */}
      <SettingsHeader showSuccess={showSuccess} error={error} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de tabs - Responsivo */}
          <div className="lg:col-span-1">
            <TabsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
          </div>

          {/* Contenido principal */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSave} className="space-y-6">
              {/* General */}
              {activeTab === "general" && (
                <GeneralSection settings={settings} handleChange={handleChange} />
              )}

              {/* Apariencia */}
              {activeTab === "appearance" && (
                <AppearanceSection
                  settings={settings}
                  handleChange={handleChange}
                  saveSettings={saveSettings}
                />
              )}

              {/* Envíos */}
              {activeTab === "shipping" && (
                <ShippingSection settings={settings} handleChange={handleChange} />
              )}

              {/* Pagos */}
              {activeTab === "payment" && (
                <PaymentSection settings={settings} handleChange={handleChange} />
              )}

              {/* Emails */}
              {activeTab === "email" && (
                <EmailSection settings={settings} handleChange={handleChange} />
              )}

              {/* Redes Sociales */}
              {activeTab === "social" && (
                <SocialSection settings={settings} handleChange={handleChange} />
              )}

              {/* SEO */}
              {activeTab === "seo" && (
                <SeoSection settings={settings} handleChange={handleChange} />
              )}

              {/* Política */}
              {activeTab === "policy" && (
                <PolicySection settings={settings} handleChange={handleChange} />
              )}

              {/* Botones de acción */}
              <SaveActions isAdmin={isAdmin} isSaving={isSaving} onReload={loadSettings} />
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
