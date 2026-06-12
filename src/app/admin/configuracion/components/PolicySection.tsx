"use client";

import { DocumentTextIcon } from "@heroicons/react/24/outline";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import type { HandleChange } from "../lib";
import { InputField, CheckBoxField, TextAreaField } from "./fields";

interface PolicySectionProps {
  settings: StoreSettings;
  handleChange: HandleChange;
}

export default function PolicySection({ settings, handleChange }: PolicySectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-gray-500" />
          Política y Documentos
        </h2>
        <p className="text-sm text-slate-500 mt-1">Enlaces a documentos importantes</p>
      </div>

      <InputField
        label="Términos y condiciones"
        value={settings.termsUrl || ""}
        onChange={(val) => handleChange(["termsUrl"], val)}
        placeholder="https://tutienda.com/terminos"
      />

      <InputField
        label="Política de privacidad"
        value={settings.privacyUrl || ""}
        onChange={(val) => handleChange(["privacyUrl"], val)}
        placeholder="https://tutienda.com/privacidad"
      />

      <InputField
        label="Política de devolución"
        value={settings.returnPolicyUrl || ""}
        onChange={(val) => handleChange(["returnPolicyUrl"], val)}
        placeholder="https://tutienda.com/devoluciones"
      />

      <InputField
        label="FAQ"
        value={settings.faqUrl || ""}
        onChange={(val) => handleChange(["faqUrl"], val)}
        placeholder="https://tutienda.com/faq"
      />

      <div className="border-t border-slate-200 pt-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <CheckBoxField
            label="Modo mantenimiento"
            checked={settings.maintenanceMode || false}
            onChange={(val) => handleChange(["maintenanceMode"], val)}
          />
          {settings.maintenanceMode && (
            <TextAreaField
              label="Mensaje de mantenimiento"
              value={settings.maintenanceMessage || ""}
              onChange={(val) => handleChange(["maintenanceMessage"], val)}
              placeholder="Estamos realizando mantenimiento. Volveremos pronto..."
              rows={3}
            />
          )}
        </div>
      </div>
    </div>
  );
}
