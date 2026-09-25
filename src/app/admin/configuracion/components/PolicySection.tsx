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

      <div className="border-t border-slate-200 pt-6 space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
          <CheckBoxField
            label="Modo vitrina — se puede mirar, no comprar"
            checked={settings.previewMode !== false}
            onChange={(val) => handleChange(["previewMode"], val)}
          />
          <p className="text-xs leading-relaxed text-amber-900">
            Con esto activado el sitio se ve completo y sale en buscadores, pero
            nadie puede pagar ni dejar un pedido: el servidor los rechaza, no es
            solo un botón escondido. <strong>Desactívalo el día que abras.</strong>
          </p>
          {settings.previewMode !== false && (
            <TextAreaField
              label="Aviso que ven los clientes"
              value={settings.previewMessage || ""}
              onChange={(val) => handleChange(["previewMessage"], val)}
              placeholder="Estamos terminando los últimos detalles. Puedes mirar todo el catálogo, pero todavía no aceptamos pedidos por la web."
              rows={3}
            />
          )}
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          <CheckBoxField
            label="Modo mantenimiento — el sitio entero fuera de línea"
            checked={settings.maintenanceMode || false}
            onChange={(val) => handleChange(["maintenanceMode"], val)}
          />
          <p className="text-xs leading-relaxed text-red-900">
            ⚠️ Este interruptor todavía <strong>no está conectado</strong>: se
            guarda, pero el sitio sigue disponible igual. Para cerrar solo las
            ventas y dejar el catálogo visible, usa el modo vitrina de arriba.
          </p>
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
