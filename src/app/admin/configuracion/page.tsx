"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import Button from "@/components/ui/Button";
import {
  CheckIcon,
  CreditCardIcon,
  TruckIcon,
  EnvelopeIcon,
  ShareIcon,
  SparklesIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import SingleImageUpload from "@/components/ui/SingleImageUpload";
import AddressAutocomplete from "@/components/AddressAutocomplete";
import type { StoreSettings } from "@/app/api/admin/settings/route";

const TABS = [
  { id: "general", label: "General", icon: Cog6ToothIcon, color: "blue" },
  { id: "appearance", label: "Apariencia", icon: SparklesIcon, color: "purple" },
  { id: "shipping", label: "Envíos", icon: TruckIcon, color: "green" },
  { id: "payment", label: "Pagos", icon: CreditCardIcon, color: "amber" },
  { id: "email", label: "Emails", icon: EnvelopeIcon, color: "red" },
  { id: "social", label: "Redes Sociales", icon: ShareIcon, color: "pink" },
  { id: "seo", label: "SEO", icon: DocumentTextIcon, color: "indigo" },
  { id: "policy", label: "Política", icon: DocumentTextIcon, color: "gray" },
];

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

  // Validación básica para la pestaña 'General'
  const validateGeneral = (s: typeof settings) => {
    const errors: string[] = [];
    const name = s.storeName || "";
    const email = s.storeEmail || "";
    const currency = s.currency || "";
    const language = s.language || "";
    const timezone = s.timezone || "";

    if (!name.trim()) errors.push("El nombre de la tienda es obligatorio.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("El email de contacto no tiene un formato válido.");
    if (currency && currency.length !== 3) errors.push("La moneda debe tener 3 letras (ej: CLP, USD).");
    if (language && language.length > 5) errors.push("Código de idioma inválido.");
    if (!timezone) errors.push("La zona horaria es obligatoria.");

    return errors;
  };

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
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Configuración</h1>
              <p className="mt-1 text-sm text-slate-500">
                Personaliza tu tienda online
              </p>
            </div>
            {showSuccess && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700 font-medium">Guardado</span>
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                <XCircleIcon className="h-5 w-5 text-red-600" />
                <span className="text-sm text-red-700 font-medium">{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar de tabs */}
          <div className="lg:col-span-1">
            <nav className="space-y-1 sticky top-24">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-all ${activeTab === tab.id
                      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-500"
                      : "text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Contenido principal */}
          <div className="lg:col-span-3">
            <form onSubmit={handleSave} className="space-y-6">
              {/* General */}
              {activeTab === "general" && (
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
              )}

              {/* Apariencia */}
              {activeTab === "appearance" && (
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InputField
                        label="URL del logo"
                        value={settings.appearance?.logoUrl || ""}
                        onChange={(val) => handleChange(["appearance", "logoUrl"], val)}
                        placeholder="/logo.png"
                      />
                      <InputField
                        label="URL del favicon"
                        value={settings.appearance?.faviconUrl || ""}
                        onChange={(val) => handleChange(["appearance", "faviconUrl"], val)}
                        placeholder="/favicon.ico"
                      />
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
                        onChange={() => {
                          if (settings.appearance?.bannerUrl) {
                            handleChange(["appearance", "bannerUrl"], null);
                          }
                        }}
                      />
                    </div>
                    {settings.appearance?.bannerUrl && (
                      <>
                        <div className="mb-4 relative w-full h-48 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                          <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url(${settings.appearance.bannerUrl})` }}
                          />
                        </div>
                        <SingleImageUpload
                          label="Cambiar banner"
                          value={settings.appearance.bannerUrl || ""}
                          onChange={async (dataUrl) => {
                            try {
                              if (dataUrl.startsWith("data:image")) {
                                const resp = await fetch("/api/admin/upload-image", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    image: dataUrl,
                                    oldUrl: settings.appearance?.bannerUrl,
                                  }),
                                });
                                if (resp.ok) {
                                  const json = await resp.json();
                                  if (json?.url) {
                                    handleChange(["appearance", "bannerUrl"], json.url);
                                    await saveSettings();
                                  }
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
                    )}
                  </div>

                  <CheckBoxField
                    label="Habilitar modo oscuro"
                    checked={settings.appearance?.enableDarkMode || false}
                    onChange={(val) => handleChange(["appearance", "enableDarkMode"], val)}
                  />
                </div>
              )}

              {/* Envíos */}
              {activeTab === "shipping" && (
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

                  <div className="border-l-4 border-emerald-500 bg-emerald-50 p-4 rounded">
                    <h3 className="font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                      <SparklesIcon className="h-5 w-5 text-emerald-600" />
                      Cálculo por Distancia (Google Maps)
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
              )}

              {/* Pagos */}
              {activeTab === "payment" && (
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
              )}

              {/* Emails */}
              {activeTab === "email" && (
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
              )}

              {/* Redes Sociales */}
              {activeTab === "social" && (
                <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <ShareIcon className="h-5 w-5 text-pink-500" />
                      Redes Sociales
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Enlaces a tus perfiles</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField
                      label="Facebook"
                      value={settings.socialMedia?.facebook || ""}
                      onChange={(val) => handleChange(["socialMedia", "facebook"], val)}
                      placeholder="https://facebook.com/..."
                    />
                    <InputField
                      label="Instagram"
                      value={settings.socialMedia?.instagram || ""}
                      onChange={(val) => handleChange(["socialMedia", "instagram"], val)}
                      placeholder="https://instagram.com/..."
                    />
                    <InputField
                      label="Twitter / X"
                      value={settings.socialMedia?.twitter || ""}
                      onChange={(val) => handleChange(["socialMedia", "twitter"], val)}
                      placeholder="https://twitter.com/..."
                    />
                    <InputField
                      label="TikTok"
                      value={settings.socialMedia?.tiktok || ""}
                      onChange={(val) => handleChange(["socialMedia", "tiktok"], val)}
                      placeholder="https://tiktok.com/@..."
                    />
                    <InputField
                      label="YouTube"
                      value={settings.socialMedia?.youtube || ""}
                      onChange={(val) => handleChange(["socialMedia", "youtube"], val)}
                      placeholder="https://youtube.com/..."
                    />
                    <InputField
                      label="LinkedIn"
                      value={settings.socialMedia?.linkedin || ""}
                      onChange={(val) => handleChange(["socialMedia", "linkedin"], val)}
                      placeholder="https://linkedin.com/..."
                    />
                    <InputField
                      label="WhatsApp"
                      value={settings.socialMedia?.whatsapp || ""}
                      onChange={(val) => handleChange(["socialMedia", "whatsapp"], val)}
                      placeholder="+56912345678"
                    />
                  </div>
                </div>
              )}

              {/* SEO */}
              {activeTab === "seo" && (
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
              )}

              {/* Política */}
              {activeTab === "policy" && (
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
              )}

              {/* Botones de acción */}
              <div className="flex justify-end gap-3">
                {isAdmin ? (
                  <>
                    <Button variant="outline" onClick={loadSettings}>
                      Recargar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="gap-2"
                    >
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <CheckIcon className="h-4 w-4" />
                          Guardar cambios
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-sm text-slate-500 py-2">Solo administradores pueden editar la configuración.</div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componentes de entrada reutilizables
interface InputFieldProps {
  label: string;
  value: any;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
  prefix?: string;
  suffix?: string;
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
  hint,
  prefix,
  suffix,
}: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-2">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">{prefix}</span>}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition ${prefix ? "pl-7" : ""
            } ${suffix ? "pr-12" : ""}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">{suffix}</span>}
      </div>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {maxLength && <p className="text-xs text-slate-400 mt-1">{value.length}/{maxLength}</p>}
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  value: any;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function SelectField({ label, value, onChange, options }: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface TextAreaFieldProps {
  label: string;
  value: any;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  hint?: string;
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  hint,
}: TextAreaFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-2">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
      />
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {maxLength && <p className="text-xs text-slate-400 mt-1">{value.length}/{maxLength}</p>}
    </div>
  );
}

interface CheckBoxFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function CheckBoxField({ label, checked, onChange }: CheckBoxFieldProps) {
  return (
    <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 transition">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-2 focus:ring-blue-500"
      />
      <span className="text-sm font-medium text-slate-900">{label}</span>
    </label>
  );
}

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
}

function ColorField({ label, value, onChange, description }: ColorFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-900 mb-2">{label}</label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-12 h-10 border border-slate-300 rounded-lg cursor-pointer"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-sm font-mono"
        />
      </div>
      {description && <p className="text-xs text-slate-500 mt-2">{description}</p>}
    </div>
  );
}
