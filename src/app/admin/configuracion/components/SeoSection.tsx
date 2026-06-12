"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import type { HandleChange } from "../lib";
import { InputField, TextAreaField } from "./fields";

interface SeoSectionProps {
  settings: StoreSettings;
  handleChange: HandleChange;
}

export default function SeoSection({ settings, handleChange }: SeoSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-indigo-500" />
          Optimización SEO
        </h2>
        <p className="text-sm text-slate-500 mt-1">Meta tags y configuración de búsqueda</p>
      </div>

      <InputField
        label="Título (meta)"
        value={settings.seoTitle || ""}
        onChange={(val) => handleChange(["seoTitle"], val)}
        maxLength={60}
        hint="Máximo 60 caracteres"
      />

      <TextAreaField
        label="Descripción (meta)"
        value={settings.seoDescription || ""}
        onChange={(val) => handleChange(["seoDescription"], val)}
        maxLength={160}
        hint="Máximo 160 caracteres"
        rows={3}
      />

      <InputField
        label="Palabras clave"
        value={settings.seoKeywords || ""}
        onChange={(val) => handleChange(["seoKeywords"], val)}
        placeholder="olivo, tienda, productos, compras online"
      />

      <InputField
        label="Imagen OG (Open Graph)"
        value={settings.ogImageUrl || ""}
        onChange={(val) => handleChange(["ogImageUrl"], val)}
        placeholder="https://..."
      />
    </div>
  );
}
