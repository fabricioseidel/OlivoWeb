"use client";

import { Cog6ToothIcon } from "@heroicons/react/24/outline";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import type { HandleChange } from "../lib";
import { InputField, SelectField } from "./fields";

interface GeneralSectionProps {
  settings: StoreSettings;
  handleChange: HandleChange;
}

export default function GeneralSection({ settings, handleChange }: GeneralSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Cog6ToothIcon className="h-5 w-5 text-blue-500" />
          Información General
        </h2>
        <p className="text-sm text-slate-500 mt-1">Datos básicos de tu tienda</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField
          label="Nombre de la tienda"
          value={settings.storeName || ""}
          onChange={(val) => handleChange(["storeName"], val)}
          placeholder="Ej: OLIVOMARKET"
        />
        <InputField
          label="Email de contacto"
          type="email"
          value={settings.storeEmail || ""}
          onChange={(val) => handleChange(["storeEmail"], val)}
          placeholder="contacto@tienda.com"
        />
        <InputField
          label="Teléfono"
          value={settings.storePhone || ""}
          onChange={(val) => handleChange(["storePhone"], val)}
          placeholder="+56 9 XXXX XXXX"
        />
        <SelectField
          label="Moneda"
          value={settings.currency || "CLP"}
          onChange={(val) => handleChange(["currency"], val)}
          options={[
            { value: "CLP", label: "Peso Chileno (CLP)" },
            { value: "USD", label: "Dólar USD" },
            { value: "EUR", label: "Euro (EUR)" },
            { value: "ARS", label: "Peso Argentino" },
            { value: "MXN", label: "Peso Mexicano" },
          ]}
        />
        <SelectField
          label="Idioma"
          value={settings.language || "es"}
          onChange={(val) => handleChange(["language"], val)}
          options={[
            { value: "es", label: "Español" },
            { value: "en", label: "Inglés" },
            { value: "pt", label: "Portugués" },
          ]}
        />
        <SelectField
          label="Zona horaria"
          value={settings.timezone || "America/Santiago"}
          onChange={(val) => handleChange(["timezone"], val)}
          options={[
            { value: "America/Santiago", label: "Santiago (GMT-4)" },
            { value: "America/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
            { value: "America/Mexico_City", label: "Ciudad de México (GMT-6)" },
            { value: "America/New_York", label: "Nueva York (GMT-5)" },
            { value: "Europe/London", label: "Londres (GMT)" },
          ]}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-900 mb-2">Dirección</label>
        <AddressAutocomplete
          value={settings.storeAddress || ""}
          onChange={(val) => {
            if (typeof val === "string") {
              handleChange(["storeAddress"], val);
            } else {
              handleChange(["storeAddress"], val.formattedAddress || "");
              if (val.city) handleChange(["storeCity"], val.city);
              if (val.postalCode) handleChange(["storePostalCode"], val.postalCode);
              if (val.country) handleChange(["storeCountry"], val.country);
            }
          }}
          placeholder="Calle, número, comuna..."
          country="cl"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <InputField
          label="Ciudad"
          value={settings.storeCity || ""}
          onChange={(val) => handleChange(["storeCity"], val)}
        />
        <InputField
          label="País"
          value={settings.storeCountry || ""}
          onChange={(val) => handleChange(["storeCountry"], val)}
        />
        <InputField
          label="Código postal"
          value={settings.storePostalCode || ""}
          onChange={(val) => handleChange(["storePostalCode"], val)}
        />
      </div>
    </div>
  );
}
