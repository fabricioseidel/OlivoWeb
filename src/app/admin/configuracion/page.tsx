"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { CheckIcon } from "@heroicons/react/24/outline";
import SingleImageUpload from "@/components/ui/SingleImageUpload";

// Datos iniciales de la tienda
const initialStoreData = {
  general: {
  storeName: "OLIVOMARKET",
  storeEmail: "contacto@olivomarket.cl",
    storePhone: "+56 9 1234 5678",
    storeAddress: "Avenida Principal 1234, Santiago, Chile",
    storeCurrency: "CLP",
    storeLanguage: "es",
    storeTimeZone: "America/Santiago",
  },
  appearance: {
    primaryColor: "#3B82F6",
    secondaryColor: "#10B981",
    logoUrl: "/logo.png",
    faviconUrl: "/favicon.ico",
    bannerUrl: "/banner.jpg",
    enableDarkMode: true,
  },
  shipping: {
    enableShipping: true,
    freeShippingMinimum: 50000,
    freeShippingEnabled: true,
    localDeliveryEnabled: true,
    localDeliveryFee: 5000,
    internationalShippingEnabled: false,
    internationalShippingFee: 15000,
  },
  payment: {
    acceptCreditCards: true,
    acceptDebitCards: true,
    acceptPaypal: false,
    acceptTransferencia: true,
    acceptMercadoPago: true,
    testMode: true,
  },
  email: {
    orderConfirmationEnabled: true,
    shippingConfirmationEnabled: true,
    orderCancellationEnabled: true,
    customerSignupEnabled: true,
    marketingEnabled: false,
  }
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [storeData, setStoreData] = useState(initialStoreData);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings');
        if (res.ok) {
          const data = await res.json();
          setStoreData((prev) => ({ ...prev, ...data } as any));
        }
      } catch (e) {
        // ignore
      } finally {
        setLoadingSettings(false);
      }
    })();
  }, []);
  
  // Manejar cambios en los campos del formulario
  const handleChange = (section: string, field: string, value: any) => {
    setStoreData({
      ...storeData,
      [section]: {
        ...storeData[section as keyof typeof storeData],
        [field]: value
      }
    });
  };
  
  // Manejar cambio en campos de tipo texto e input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, section: string) => {
    const { name, value, type } = e.target;
    
    if (type === "checkbox") {
      handleChange(section, name, (e.target as HTMLInputElement).checked);
    } else if (type === "number") {
      handleChange(section, name, parseFloat(value));
    } else {
      handleChange(section, name, value);
    }
  };
  
  // Guardar configuración
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSettings(storeData);
  };

  // Reusable save function (can be called for partial or full storeData)
  const saveSettings = async (dataToSave: any) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSave) });
      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        const json = await res.json().catch(() => ({}));
        alert('Error guardando: ' + (json.message || res.statusText));
      }
    } catch (e:any) {
      alert('Error guardando: ' + e.message);
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
        <p className="mt-1 text-sm text-gray-500">
          Administra las opciones y configuraciones de tu tienda
        </p>
      </div>
      
      {/* Mensaje de éxito */}
      {showSuccess && (
        <div className="mb-6 bg-green-50 border-l-4 border-green-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckIcon className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                Configuración guardada correctamente.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Pestañas de configuración */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab("general")}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === "general"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              General
            </button>
            <button
              onClick={() => setActiveTab("appearance")}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === "appearance"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Apariencia
            </button>
            <button
              onClick={() => setActiveTab("shipping")}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === "shipping"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Envíos
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === "payment"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Pagos
            </button>
            <button
              onClick={() => setActiveTab("email")}
              className={`whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm ${
                activeTab === "email"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Email
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          <form onSubmit={handleSave}>
            {/* Configuración general */}
            {activeTab === "general" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Información de la tienda</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="storeName" className="block text-sm font-medium text-gray-700">
                      Nombre de la tienda
                    </label>
                    <input
                      type="text"
                      name="storeName"
                      id="storeName"
                      value={storeData.general.storeName}
                      onChange={(e) => handleInputChange(e, "general")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="storeEmail" className="block text-sm font-medium text-gray-700">
                      Email de contacto
                    </label>
                    <input
                      type="email"
                      name="storeEmail"
                      id="storeEmail"
                      value={storeData.general.storeEmail}
                      onChange={(e) => handleInputChange(e, "general")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="storePhone" className="block text-sm font-medium text-gray-700">
                      Teléfono de contacto
                    </label>
                    <input
                      type="text"
                      name="storePhone"
                      id="storePhone"
                      value={storeData.general.storePhone}
                      onChange={(e) => handleInputChange(e, "general")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700">
                      Dirección
                    </label>
                    <input
                      type="text"
                      name="storeAddress"
                      id="storeAddress"
                      value={storeData.general.storeAddress}
                      onChange={(e) => handleInputChange(e, "general")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="storeCurrency" className="block text-sm font-medium text-gray-700">
                      Moneda
                    </label>
                    <select
                      name="storeCurrency"
                      id="storeCurrency"
                      value={storeData.general.storeCurrency}
                      onChange={(e) => handleInputChange(e, "general")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="CLP">Peso Chileno (CLP)</option>
                      <option value="USD">Dólar Estadounidense (USD)</option>
                      <option value="EUR">Euro (EUR)</option>
                      <option value="ARS">Peso Argentino (ARS)</option>
                      <option value="MXN">Peso Mexicano (MXN)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="storeLanguage" className="block text-sm font-medium text-gray-700">
                      Idioma
                    </label>
                    <select
                      name="storeLanguage"
                      id="storeLanguage"
                      value={storeData.general.storeLanguage}
                      onChange={(e) => handleInputChange(e, "general")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="es">Español</option>
                      <option value="en">Inglés</option>
                      <option value="pt">Portugués</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="storeTimeZone" className="block text-sm font-medium text-gray-700">
                      Zona horaria
                    </label>
                    <select
                      name="storeTimeZone"
                      id="storeTimeZone"
                      value={storeData.general.storeTimeZone}
                      onChange={(e) => handleInputChange(e, "general")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="America/Santiago">Santiago (GMT-4)</option>
                      <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
                      <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
                      <option value="America/Bogota">Bogotá (GMT-5)</option>
                      <option value="America/Lima">Lima (GMT-5)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            
            {/* Configuración de apariencia */}
            {activeTab === "appearance" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Apariencia de la tienda</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
                      Color primario
                    </label>
                    <div className="mt-1 flex items-center">
                      <input
                        type="color"
                        name="primaryColor"
                        id="primaryColor"
                        value={storeData.appearance.primaryColor}
                        onChange={(e) => handleInputChange(e, "appearance")}
                        className="h-8 w-8 rounded border border-gray-300 mr-2"
                      />
                      <input
                        type="text"
                        value={storeData.appearance.primaryColor}
                        onChange={(e) => handleInputChange({ target: { name: "primaryColor", value: e.target.value, type: "text" } } as any, "appearance")}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700">
                      Color secundario
                    </label>
                    <div className="mt-1 flex items-center">
                      <input
                        type="color"
                        name="secondaryColor"
                        id="secondaryColor"
                        value={storeData.appearance.secondaryColor}
                        onChange={(e) => handleInputChange(e, "appearance")}
                        className="h-8 w-8 rounded border border-gray-300 mr-2"
                      />
                      <input
                        type="text"
                        value={storeData.appearance.secondaryColor}
                        onChange={(e) => handleInputChange({ target: { name: "secondaryColor", value: e.target.value, type: "text" } } as any, "appearance")}
                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">
                      URL del logo
                    </label>
                    <input
                      type="text"
                      name="logoUrl"
                      id="logoUrl"
                      value={storeData.appearance.logoUrl}
                      onChange={(e) => handleInputChange(e, "appearance")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="faviconUrl" className="block text-sm font-medium text-gray-700">
                      URL del favicon
                    </label>
                    <input
                      type="text"
                      name="faviconUrl"
                      id="faviconUrl"
                      value={storeData.appearance.faviconUrl}
                      onChange={(e) => handleInputChange(e, "appearance")}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="bannerUrl" className="block text-sm font-medium text-gray-700">
                      URL del banner
                    </label>
                    <input
                      type="text"
                      name="bannerUrl"
                      id="bannerUrl"
                      value={storeData.appearance.bannerUrl}
                      onChange={(e) => handleInputChange(e, "appearance")}
                      onBlur={() => saveSettings(storeData)}
                      placeholder="https://... o pegar una imagen"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                    <div className="mt-3">
                      <SingleImageUpload
                        label="Subir banner"
                        value={storeData.appearance.bannerUrl || ""}
                        onChange={async (dataUrl) => {
                          const updated = { ...storeData, appearance: { ...storeData.appearance, bannerUrl: dataUrl } };
                          setStoreData(updated);
                          await saveSettings(updated);
                        }}
                      />

                      {/* Vista previa y estado de guardado */}
                      {storeData.appearance.bannerUrl ? (
                        <div className="mt-3">
                          <div className="w-full h-36 rounded-md overflow-hidden border border-gray-200 bg-gray-50 relative">
                            <div
                              style={{ backgroundImage: `url(${storeData.appearance.bannerUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                              className="absolute inset-0"
                            />
                          </div>
                          <div className="mt-2 flex items-center text-sm text-gray-600">
                            {isSaving ? (
                              <span className="text-gray-500">Guardando...</span>
                            ) : showSuccess ? (
                              <>
                                <CheckIcon className="h-4 w-4 text-green-500 mr-1" />
                                <span className="text-green-700">Guardado</span>
                              </>
                            ) : (
                              <span>Vista previa</span>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="enableDarkMode"
                      name="enableDarkMode"
                      type="checkbox"
                      checked={storeData.appearance.enableDarkMode}
                      onChange={(e) => handleInputChange(e, "appearance")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableDarkMode" className="ml-2 block text-sm text-gray-900">
                      Habilitar modo oscuro
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Configuración de envíos */}
            {activeTab === "shipping" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Opciones de envío</h2>
                
                <div className="grid grid-cols-1 gap-6">
                  <div className="flex items-center">
                    <input
                      id="enableShipping"
                      name="enableShipping"
                      type="checkbox"
                      checked={storeData.shipping.enableShipping}
                      onChange={(e) => handleInputChange(e, "shipping")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enableShipping" className="ml-2 block text-sm text-gray-900">
                      Habilitar envíos
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="freeShippingEnabled"
                      name="freeShippingEnabled"
                      type="checkbox"
                      checked={storeData.shipping.freeShippingEnabled}
                      onChange={(e) => handleInputChange(e, "shipping")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="freeShippingEnabled" className="ml-2 block text-sm text-gray-900">
                      Habilitar envío gratis para pedidos mayores a:
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="freeShippingMinimum" className="block text-sm font-medium text-gray-700">
                      Monto mínimo para envío gratis
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        name="freeShippingMinimum"
                        id="freeShippingMinimum"
                        value={storeData.shipping.freeShippingMinimum}
                        onChange={(e) => handleInputChange(e, "shipping")}
                        className="mt-1 block w-full pl-7 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        disabled={!storeData.shipping.freeShippingEnabled}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="localDeliveryEnabled"
                      name="localDeliveryEnabled"
                      type="checkbox"
                      checked={storeData.shipping.localDeliveryEnabled}
                      onChange={(e) => handleInputChange(e, "shipping")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="localDeliveryEnabled" className="ml-2 block text-sm text-gray-900">
                      Habilitar entrega local
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="localDeliveryFee" className="block text-sm font-medium text-gray-700">
                      Costo de entrega local
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        name="localDeliveryFee"
                        id="localDeliveryFee"
                        value={storeData.shipping.localDeliveryFee}
                        onChange={(e) => handleInputChange(e, "shipping")}
                        className="mt-1 block w-full pl-7 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        disabled={!storeData.shipping.localDeliveryEnabled}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="internationalShippingEnabled"
                      name="internationalShippingEnabled"
                      type="checkbox"
                      checked={storeData.shipping.internationalShippingEnabled}
                      onChange={(e) => handleInputChange(e, "shipping")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="internationalShippingEnabled" className="ml-2 block text-sm text-gray-900">
                      Habilitar envío internacional
                    </label>
                  </div>
                  
                  <div>
                    <label htmlFor="internationalShippingFee" className="block text-sm font-medium text-gray-700">
                      Costo de envío internacional
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-gray-500 sm:text-sm">$</span>
                      </div>
                      <input
                        type="number"
                        name="internationalShippingFee"
                        id="internationalShippingFee"
                        value={storeData.shipping.internationalShippingFee}
                        onChange={(e) => handleInputChange(e, "shipping")}
                        className="mt-1 block w-full pl-7 border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        disabled={!storeData.shipping.internationalShippingEnabled}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Configuración de pagos */}
            {activeTab === "payment" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Métodos de pago</h2>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center">
                    <input
                      id="acceptCreditCards"
                      name="acceptCreditCards"
                      type="checkbox"
                      checked={storeData.payment.acceptCreditCards}
                      onChange={(e) => handleInputChange(e, "payment")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="acceptCreditCards" className="ml-2 block text-sm text-gray-900">
                      Aceptar tarjetas de crédito
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="acceptDebitCards"
                      name="acceptDebitCards"
                      type="checkbox"
                      checked={storeData.payment.acceptDebitCards}
                      onChange={(e) => handleInputChange(e, "payment")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="acceptDebitCards" className="ml-2 block text-sm text-gray-900">
                      Aceptar tarjetas de débito
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="acceptPaypal"
                      name="acceptPaypal"
                      type="checkbox"
                      checked={storeData.payment.acceptPaypal}
                      onChange={(e) => handleInputChange(e, "payment")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="acceptPaypal" className="ml-2 block text-sm text-gray-900">
                      Aceptar PayPal
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="acceptTransferencia"
                      name="acceptTransferencia"
                      type="checkbox"
                      checked={storeData.payment.acceptTransferencia}
                      onChange={(e) => handleInputChange(e, "payment")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="acceptTransferencia" className="ml-2 block text-sm text-gray-900">
                      Aceptar transferencia bancaria
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="acceptMercadoPago"
                      name="acceptMercadoPago"
                      type="checkbox"
                      checked={storeData.payment.acceptMercadoPago}
                      onChange={(e) => handleInputChange(e, "payment")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="acceptMercadoPago" className="ml-2 block text-sm text-gray-900">
                      Aceptar MercadoPago
                    </label>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center">
                      <input
                        id="testMode"
                        name="testMode"
                        type="checkbox"
                        checked={storeData.payment.testMode}
                        onChange={(e) => handleInputChange(e, "payment")}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="testMode" className="ml-2 block text-sm text-gray-900">
                        Modo de pruebas (no se realizarán cobros reales)
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Configuración de emails */}
            {activeTab === "email" && (
              <div className="space-y-6">
                <h2 className="text-lg font-medium text-gray-900">Configuración de emails</h2>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="flex items-center">
                    <input
                      id="orderConfirmationEnabled"
                      name="orderConfirmationEnabled"
                      type="checkbox"
                      checked={storeData.email.orderConfirmationEnabled}
                      onChange={(e) => handleInputChange(e, "email")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="orderConfirmationEnabled" className="ml-2 block text-sm text-gray-900">
                      Enviar email de confirmación de pedido
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="shippingConfirmationEnabled"
                      name="shippingConfirmationEnabled"
                      type="checkbox"
                      checked={storeData.email.shippingConfirmationEnabled}
                      onChange={(e) => handleInputChange(e, "email")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="shippingConfirmationEnabled" className="ml-2 block text-sm text-gray-900">
                      Enviar email de confirmación de envío
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="orderCancellationEnabled"
                      name="orderCancellationEnabled"
                      type="checkbox"
                      checked={storeData.email.orderCancellationEnabled}
                      onChange={(e) => handleInputChange(e, "email")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="orderCancellationEnabled" className="ml-2 block text-sm text-gray-900">
                      Enviar email de cancelación de pedido
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="customerSignupEnabled"
                      name="customerSignupEnabled"
                      type="checkbox"
                      checked={storeData.email.customerSignupEnabled}
                      onChange={(e) => handleInputChange(e, "email")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="customerSignupEnabled" className="ml-2 block text-sm text-gray-900">
                      Enviar email de bienvenida a nuevos clientes
                    </label>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      id="marketingEnabled"
                      name="marketingEnabled"
                      type="checkbox"
                      checked={storeData.email.marketingEnabled}
                      onChange={(e) => handleInputChange(e, "email")}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="marketingEnabled" className="ml-2 block text-sm text-gray-900">
                      Enviar emails de marketing y promociones
                    </label>
                  </div>
                </div>
              </div>
            )}
            
            {/* Botones de acción */}
            <div className="mt-8 flex justify-end">
              <Button
                type="submit"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Guardando...
                  </>
                ) : (
                  "Guardar configuración"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
