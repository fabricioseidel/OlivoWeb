"use client";

import { CreditCardIcon } from "@heroicons/react/24/outline";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import type { HandleChange } from "../lib";
import { CheckBoxField } from "./fields";

interface PaymentSectionProps {
  settings: StoreSettings;
  handleChange: HandleChange;
}

export default function PaymentSection({ settings, handleChange }: PaymentSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5 text-amber-500" />
          Métodos de Pago
        </h2>
        <p className="text-sm text-slate-500 mt-1">Configura qué formas de pago aceptas</p>
      </div>

      <div className="space-y-3">
        <CheckBoxField
          label="Tarjeta de crédito"
          checked={settings.paymentMethods?.creditCard || false}
          onChange={(val) => handleChange(["paymentMethods", "creditCard"], val)}
        />
        <CheckBoxField
          label="Tarjeta de débito"
          checked={settings.paymentMethods?.debitCard || false}
          onChange={(val) => handleChange(["paymentMethods", "debitCard"], val)}
        />
        <CheckBoxField
          label="Transferencia bancaria"
          checked={settings.paymentMethods?.bankTransfer || false}
          onChange={(val) => handleChange(["paymentMethods", "bankTransfer"], val)}
        />
        <CheckBoxField
          label="PayPal"
          checked={settings.paymentMethods?.paypal || false}
          onChange={(val) => handleChange(["paymentMethods", "paypal"], val)}
        />
        <CheckBoxField
          label="Mercado Pago"
          checked={settings.paymentMethods?.mercadoPago || false}
          onChange={(val) => handleChange(["paymentMethods", "mercadoPago"], val)}
        />
        <CheckBoxField
          label="Criptomonedas"
          checked={settings.paymentMethods?.crypto || false}
          onChange={(val) => handleChange(["paymentMethods", "crypto"], val)}
        />
      </div>

      <div className="border-t border-slate-200 pt-6">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <CheckBoxField
            label="Modo prueba (sin cobros reales)"
            checked={settings.paymentTestMode || false}
            onChange={(val) => handleChange(["paymentTestMode"], val)}
          />
          <p className="text-sm text-amber-700 mt-2">
            {settings.paymentTestMode
              ? "✓ Los pagos serán simulados, no se procesarán realmente"
              : "⚠️ Los pagos se procesarán realmente"}
          </p>
        </div>
      </div>
    </div>
  );
}
