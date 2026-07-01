"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import SingleImageUpload from "@/components/ui/SingleImageUpload";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import { uploadImageServerAction } from "@/actions/upload";
import type { HandleChange } from "../lib";
import { ColorField, InputField, CheckBoxField, TextAreaField } from "./fields";

interface AppearanceSectionProps {
  settings: StoreSettings;
  handleChange: HandleChange;
  saveSettings: () => Promise<void>;
}

export default function AppearanceSection({ settings, handleChange, saveSettings }: AppearanceSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-purple-500" />
          Personalización de Apariencia
        </h2>
        <p className="text-sm text-slate-500 mt-1">Colores, logo e imágenes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ColorField
          label="Color primario"
          value={settings.appearance?.primaryColor || "#10B981"}
          onChange={(val) => handleChange(["appearance", "primaryColor"], val)}
          description="Color principal de botones y enlaces"
        />
        <ColorField
          label="Color secundario"
          value={settings.appearance?.secondaryColor || "#059669"}
          onChange={(val) => handleChange(["appearance", "secondaryColor"], val)}
          description="Color de acentos"
        />
        <ColorField
          label="Color de acento"
          value={settings.appearance?.accentColor || "#047857"}
          onChange={(val) => handleChange(["appearance", "accentColor"], val)}
          description="Detalles y énfasis"
        />
      </div>

      <div className="border-t border-slate-200 pt-6">
        <h3 className="font-semibold text-slate-900 mb-4">Imágenes</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Logo */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-900">Logo de la tienda</label>
            {settings.appearance?.logoUrl && (
              <div className="flex items-center justify-center h-20 bg-slate-50 rounded-lg border border-slate-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of dynamic/external URL */}
                <img
                  src={settings.appearance.logoUrl}
                  alt="Logo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            )}
            <SingleImageUpload
              label={settings.appearance?.logoUrl ? "Cambiar logo" : "Subir logo"}
              value={settings.appearance?.logoUrl || ""}
              onChange={async (dataUrl) => {
                try {
                  if (dataUrl.startsWith("data:image")) {
                    const resp = await uploadImageServerAction(dataUrl, settings.appearance?.logoUrl || undefined);
                    if (resp.ok && resp.url) {
                      handleChange(["appearance", "logoUrl"], resp.url);
                      await saveSettings();
                    }
                  } else {
                    handleChange(["appearance", "logoUrl"], dataUrl);
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
            />
            <InputField
              label="O ingresa URL manual"
              value={settings.appearance?.logoUrl || ""}
              onChange={(val) => handleChange(["appearance", "logoUrl"], val)}
              placeholder="/logo.png"
            />
          </div>

          {/* Favicon */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-900">Favicon</label>
            {settings.appearance?.faviconUrl && (
              <div className="flex items-center justify-center h-20 bg-slate-50 rounded-lg border border-slate-200 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- admin-only preview of dynamic/external URL */}
                <img
                  src={settings.appearance.faviconUrl}
                  alt="Favicon"
                  className="max-h-12 max-w-12 object-contain"
                />
              </div>
            )}
            <SingleImageUpload
              label={settings.appearance?.faviconUrl ? "Cambiar favicon" : "Subir favicon"}
              value={settings.appearance?.faviconUrl || ""}
              onChange={async (dataUrl) => {
                try {
                  if (dataUrl.startsWith("data:image")) {
                    const resp = await uploadImageServerAction(dataUrl, settings.appearance?.faviconUrl || undefined);
                    if (resp.ok && resp.url) {
                      handleChange(["appearance", "faviconUrl"], resp.url);
                      await saveSettings();
                    }
                  } else {
                    handleChange(["appearance", "faviconUrl"], dataUrl);
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
            />
            <InputField
              label="O ingresa URL manual"
              value={settings.appearance?.faviconUrl || ""}
              onChange={(val) => handleChange(["appearance", "faviconUrl"], val)}
              placeholder="/favicon.ico"
            />
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Banner principal</h3>
            <p className="text-sm text-slate-500">Imagen de encabezado en la página de inicio</p>
          </div>
          <CheckBoxField
            label="Habilitar"
            checked={!!settings.appearance?.bannerUrl}
            onChange={(checked) => {
              if (!checked) {
                handleChange(["appearance", "bannerUrl"], null);
              }
            }}
          />
        </div>
        {settings.appearance?.bannerUrl ? (
          <>
            <div className="mb-4 relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${settings.appearance.bannerUrl})` }}
              />
            </div>
            <SingleImageUpload
              label="Cambiar banner"
              value={settings.appearance.bannerUrl}
              onChange={async (dataUrl) => {
                try {
                  if (dataUrl.startsWith("data:image")) {
                    const resp = await uploadImageServerAction(dataUrl, settings.appearance?.bannerUrl || undefined);
                    if (resp.ok && resp.url) {
                      handleChange(["appearance", "bannerUrl"], resp.url);
                      await saveSettings();
                    }
                  } else {
                    handleChange(["appearance", "bannerUrl"], dataUrl);
                  }
                } catch (e) {
                  console.error(e);
                }
              }}
            />
          </>
        ) : (
          <SingleImageUpload
            label="Subir banner"
            value=""
            onChange={async (dataUrl) => {
              try {
                if (dataUrl.startsWith("data:image")) {
                  const resp = await uploadImageServerAction(dataUrl, undefined);
                  if (resp.ok && resp.url) {
                    handleChange(["appearance", "bannerUrl"], resp.url);
                    await saveSettings();
                  }
                } else {
                  handleChange(["appearance", "bannerUrl"], dataUrl);
                }
              } catch (e) {
                console.error(e);
              }
            }}
          />
        )}
      </div>

      <CheckBoxField
        label="Habilitar modo oscuro"
        checked={settings.appearance?.enableDarkMode || false}
        onChange={(val) => handleChange(["appearance", "enableDarkMode"], val)}
      />

      <div className="border-t border-slate-200 pt-6">
        <h3 className="font-semibold text-slate-900 mb-4">Contenido del Hero (Inicio)</h3>
        <div className="space-y-4">
          <InputField
            label="Título del Hero"
            value={settings.heroTitle || ""}
            onChange={(val) => handleChange(["heroTitle"], val)}
            placeholder="Sabor que te conecta con casa"
          />
          <TextAreaField
            label="Descripción del Hero"
            value={settings.heroDescription || ""}
            onChange={(val) => handleChange(["heroDescription"], val)}
            rows={3}
            placeholder="Llevamos lo mejor de Venezuela directo a tu puerta en Chile..."
          />
        </div>
      </div>
    </div>
  );
}
