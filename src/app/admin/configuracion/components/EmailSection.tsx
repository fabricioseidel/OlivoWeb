"use client";

import { EnvelopeIcon } from "@heroicons/react/24/outline";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import type { HandleChange } from "../lib";
import { InputField, CheckBoxField } from "./fields";

interface EmailSectionProps {
  settings: StoreSettings;
  handleChange: HandleChange;
}

export default function EmailSection({ settings, handleChange }: EmailSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <EnvelopeIcon className="h-5 w-5 text-red-500" />
          Configuración de Emails
        </h2>
        <p className="text-sm text-slate-500 mt-1">Notificaciones automáticas</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          label="Email remitente"
          type="email"
          value={settings.emailFromAddress || ""}
          onChange={(val) => handleChange(["emailFromAddress"], val)}
        />
        <InputField
          label="Nombre remitente"
          value={settings.emailFromName || ""}
          onChange={(val) => handleChange(["emailFromName"], val)}
        />
      </div>

      <div className="space-y-3">
        <CheckBoxField
          label="Email de confirmación de pedido"
          checked={settings.orderConfirmationEnabled || false}
          onChange={(val) => handleChange(["orderConfirmationEnabled"], val)}
        />
        <CheckBoxField
          label="Email de confirmación de envío"
          checked={settings.shippingConfirmationEnabled || false}
          onChange={(val) => handleChange(["shippingConfirmationEnabled"], val)}
        />
        <CheckBoxField
          label="Email de cancelación de pedido"
          checked={settings.orderCancellationEnabled || false}
          onChange={(val) => handleChange(["orderCancellationEnabled"], val)}
        />
        <CheckBoxField
          label="Email de bienvenida a nuevos clientes"
          checked={settings.customerSignupWelcomeEnabled || false}
          onChange={(val) => handleChange(["customerSignupWelcomeEnabled"], val)}
        />
        <CheckBoxField
          label="Permitir emails de marketing"
          checked={settings.marketingEmailsEnabled || false}
          onChange={(val) => handleChange(["marketingEmailsEnabled"], val)}
        />
      </div>
    </div>
  );
}
