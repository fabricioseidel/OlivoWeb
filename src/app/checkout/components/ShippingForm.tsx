import React from 'react';
import Input from "@/components/ui/Input";
import AddressAutocomplete, { AddressResult } from "@/components/AddressAutocomplete";

export interface ShippingInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  apartment?: string;
  tower?: string;
  deliverySchedule?: string;
}

export interface ShippingMethod {
  id: string;
  name: string;
  price: number;
  days: string;
}

interface ShippingFormProps {
  shippingInfo: ShippingInfo;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAddressSelect: (val: AddressResult | string) => void;
  shippingMethods: ShippingMethod[];
  selectedMethod: string;
  onMethodChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isCalculating?: boolean;
}

export default function ShippingForm({
  shippingInfo,
  onChange,
  onAddressSelect,
  shippingMethods,
  selectedMethod,
  onMethodChange,
  isCalculating
}: ShippingFormProps) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-black text-gray-900 mb-6">Información de Envío</h2>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Nombre completo"
            id="fullName"
            name="fullName"
            type="text"
            required
            value={shippingInfo.fullName}
            onChange={onChange}
          />
        </div>

        <div>
          <Input
            label="Correo electrónico"
            id="email"
            name="email"
            type="email"
            required
            value={shippingInfo.email}
            onChange={onChange}
          />
        </div>

        <div>
          <Input
            label="Teléfono"
            id="phone"
            name="phone"
            type="tel"
            required
            value={shippingInfo.phone}
            onChange={onChange}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="address" className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 mb-2">Dirección</label>
          <AddressAutocomplete
            id="address"
            name="address"
            value={shippingInfo.address}
            onChange={onAddressSelect}
            placeholder="Calle, número, comuna..."
            country="cl"
            required
          />
        </div>

        <div>
          <Input
            label="Ciudad"
            id="city"
            name="city"
            type="text"
            required
            value={shippingInfo.city}
            onChange={onChange}
          />
        </div>

        <div>
          <Input
            label="Región/Provincia"
            id="state"
            name="state"
            type="text"
            required
            value={shippingInfo.state}
            onChange={onChange}
          />
        </div>

        <div>
          <Input
            label="Código Postal"
            id="zipCode"
            name="zipCode"
            type="text"
            required
            value={shippingInfo.zipCode}
            onChange={onChange}
          />
        </div>

        <div>
          <Input
            label="País"
            id="country"
            name="country"
            type="text"
            disabled
            value={shippingInfo.country}
            onChange={onChange}
          />
        </div>

        <div>
          <Input
            label="Depto / Oficina (Opcional)"
            id="apartment"
            name="apartment"
            type="text"
            value={shippingInfo.apartment || ''}
            placeholder="Ej: 402, B-3"
            onChange={onChange}
          />
        </div>

        <div>
          <Input
            label="Torre / Bloque (Opcional)"
            id="tower"
            name="tower"
            type="text"
            value={shippingInfo.tower || ''}
            placeholder="Ej: Torre A"
            onChange={onChange}
          />
        </div>
      </div>

      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-gray-900 tracking-tight">Método de Envío</h3>
          {isCalculating && (
            <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-pulse">
              <div className="animate-spin h-3.3 w-3.5 border-2 border-emerald-600 border-t-transparent rounded-full mr-2" />
              Calculando distancia...
            </div>
          )}
        </div>

        <div className="space-y-4">
          {(!shippingMethods.find(m => m.id === 'dynamic')) && (
            <div className="flex items-center justify-between p-5 border-2 border-dashed border-gray-100 rounded-[1.5rem] bg-gray-50/50 opacity-80">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mr-4 border border-gray-200">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-gray-400 font-black uppercase tracking-[0.15em] text-[10px] mb-1">Envío a Domicilio</div>
                  <div className="text-gray-400 text-xs font-bold italic line-clamp-1">Esperando dirección para calcular costo...</div>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-200/50 px-2 py-1 rounded-lg">Pendiente</span>
              </div>
            </div>
          )}

          {shippingMethods.map((method) => (
            <label
              key={method.id}
              htmlFor={method.id}
              className={`flex items-center justify-between p-5 border-2 rounded-[1.5rem] cursor-pointer transition-all duration-300 ${selectedMethod === method.id ? 'border-emerald-600 bg-emerald-50/50 shadow-lg shadow-emerald-900/5 translate-y-[-2px]' : 'border-gray-50 hover:border-emerald-200 bg-white shadow-sm'}`}
            >
              <div className="flex items-center flex-1">
                <div className="relative flex items-center justify-center">
                   <input
                    id={method.id}
                    name="shippingMethod"
                    type="radio"
                    value={method.id}
                    checked={selectedMethod === method.id}
                    onChange={onMethodChange}
                    className="h-5 w-5 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer"
                  />
                </div>
                
                <div className="ml-5 flex items-center gap-4">
                  {method.id === 'dynamic' && (
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                  )}
                  {method.id === 'pickup' && (
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="text-gray-900 font-black tracking-tight leading-none mb-1">{method.name}</p>
                    <p className="text-gray-500 text-[11px] font-bold uppercase tracking-widest">{method.days}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                {method.price === 0 ? (
                  <span className="text-emerald-600 font-black text-lg">Gratis</span>
                ) : (
                  <span className="text-gray-900 font-black text-lg">${method.price.toLocaleString('es-CL')}</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
