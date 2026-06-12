"use client";

import { TruckIcon, XCircleIcon, SparklesIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import type { HandleChange } from "../lib";
import { InputField, CheckBoxField } from "./fields";

interface ShippingSectionProps {
  settings: StoreSettings;
  handleChange: HandleChange;
}

export default function ShippingSection({ settings, handleChange }: ShippingSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <TruckIcon className="h-5 w-5 text-green-500" />
          Opciones de Envío
        </h2>
        <p className="text-sm text-slate-500 mt-1">Configura métodos y costos de envío</p>
      </div>

      <CheckBoxField
        label="Habilitar envíos"
        checked={settings.shipping?.enableShipping || false}
        onChange={(val) => handleChange(["shipping", "enableShipping"], val)}
      />

      <div className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
        <h3 className="font-semibold text-red-900 mb-4 flex items-center gap-2">
          <XCircleIcon className="h-5 w-5 text-red-600" />
          Modo Alta Demanda
        </h3>
        <CheckBoxField
          label="Activar alerta de Alta Demanda"
          checked={settings.shipping?.isHighDemand || false}
          onChange={(val) => handleChange(["shipping", "isHighDemand"], val)}
        />
        <p className="mt-2 text-xs text-red-700">
          Cuando esté activo, los clientes verán una alerta visible en el Checkout y se les incentivará a escoger el siguiente bloque horario. Usar en momentos críticos (lluvia, saturación, feriados).
        </p>
      </div>

      <div className="border-l-4 border-emerald-500 bg-emerald-50 p-4 rounded">
        <h3 className="font-semibold text-emerald-900 mb-4 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-emerald-600" />
          Cálculo por Distancia (Haversine)
        </h3>
        <CheckBoxField
          label="Habilitar calculadora dinámica de envíos"
          checked={settings.shipping?.enableDynamicShipping || false}
          onChange={(val) => handleChange(["shipping", "enableDynamicShipping"], val)}
        />
        {settings.shipping?.enableDynamicShipping && (
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField
                label="Tarifa base de despacho"
                type="number"
                value={settings.shipping?.shippingBaseFee || 0}
                onChange={(val) => handleChange(["shipping", "shippingBaseFee"], Number(val))}
                prefix="$"
                hint="Costo fijo inicial de cada envío"
              />
              <InputField
                label="Precio por Kilómetro"
                type="number"
                value={settings.shipping?.shippingPricePerKm || 0}
                onChange={(val) => handleChange(["shipping", "shippingPricePerKm"], Number(val))}
                prefix="$"
                hint="Costo adicional por cada KM de distancia"
              />
            </div>

            <div className="pt-4 border-t border-emerald-200">
              <label className="block text-sm font-medium text-emerald-900 mb-2">
                Punto de Origen (Dirección de tu Tienda o Bodega)
              </label>
              <AddressAutocomplete
                value={settings.storeAddress || ""}
                onChange={(val) => {
                  if (typeof val === "string") {
                    handleChange(["storeAddress"], val);
                  } else {
                    handleChange(["storeAddress"], val.formattedAddress || "");
                    if (val.lat) handleChange(["shipping", "shippingOriginLat"], val.lat);
                    if (val.lng) handleChange(["shipping", "shippingOriginLng"], val.lng);
                    if (val.city) handleChange(["storeCity"], val.city);
                  }
                }}
                placeholder="Busca la ubicación exacta de tu bodega..."
              />
              {(settings.shipping?.shippingOriginLat && settings.shipping?.shippingOriginLng) ? (
                <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircleIcon className="h-4 w-4" />
                  Coordenadas de origen configuradas satisfactoriamente
                </p>
              ) : (
                <p className="mt-2 text-xs text-amber-600 italic">
                  * Debes seleccionar una dirección del buscador para guardar las coordenadas necesarias para el cálculo.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
        <h3 className="font-semibold text-blue-900 mb-4">Envío Gratis</h3>
        <CheckBoxField
          label="Habilitar envío gratis para pedidos sobre monto mínimo"
          checked={settings.shipping?.freeShippingEnabled || false}
          onChange={(val) => handleChange(["shipping", "freeShippingEnabled"], val)}
        />
        {settings.shipping?.freeShippingEnabled && (
          <div className="mt-4">
            <InputField
              label="Monto mínimo"
              type="number"
              value={settings.shipping?.freeShippingMinimum || 0}
              onChange={(val) => handleChange(["shipping", "freeShippingMinimum"], Number(val))}
              prefix="$"
            />
          </div>
        )}
      </div>

      <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
        <h3 className="font-semibold text-green-900 mb-4">Entrega Local</h3>
        <CheckBoxField
          label="Habilitar entrega local"
          checked={settings.shipping?.localDeliveryEnabled || false}
          onChange={(val) => handleChange(["shipping", "localDeliveryEnabled"], val)}
        />
        {settings.shipping?.localDeliveryEnabled && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputField
              label="Costo de entrega"
              type="number"
              value={settings.shipping?.localDeliveryFee || 0}
              onChange={(val) => handleChange(["shipping", "localDeliveryFee"], Number(val))}
              prefix="$"
            />
            <InputField
              label="Días de entrega"
              type="number"
              value={settings.shipping?.localDeliveryTimeDays || 3}
              onChange={(val) => handleChange(["shipping", "localDeliveryTimeDays"], Number(val))}
              suffix="días"
            />
          </div>
        )}
      </div>

      <div className="border-l-4 border-amber-500 bg-amber-50 p-4 rounded">
        <h3 className="font-semibold text-amber-900 mb-4">Envío Internacional</h3>
        <CheckBoxField
          label="Habilitar envío internacional"
          checked={settings.shipping?.internationalShippingEnabled || false}
          onChange={(val) => handleChange(["shipping", "internationalShippingEnabled"], val)}
        />
        {settings.shipping?.internationalShippingEnabled && (
          <div className="mt-4">
            <InputField
              label="Costo de envío internacional"
              type="number"
              value={settings.shipping?.internationalShippingFee || 0}
              onChange={(val) => handleChange(["shipping", "internationalShippingFee"], Number(val))}
              prefix="$"
            />
          </div>
        )}
      </div>
    </div>
  );
}
