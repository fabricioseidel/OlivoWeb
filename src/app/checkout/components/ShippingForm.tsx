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
}

export default function ShippingForm({
  shippingInfo,
  onChange,
  onAddressSelect,
  shippingMethods,
  selectedMethod,
  onMethodChange
}: ShippingFormProps) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Información de Envío</h2>
      
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <AddressAutocomplete
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
      </div>
      
      <div className="mt-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Método de Envío</h3>
        
        <div className="space-y-3">
          {shippingMethods.map((method) => (
            <label 
              key={method.id}
              htmlFor={method.id} 
              className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedMethod === method.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
            >
              <div className="flex items-center">
                <input
                  id={method.id}
                  name="shippingMethod"
                  type="radio"
                  value={method.id}
                  checked={selectedMethod === method.id}
                  onChange={onMethodChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="flex items-center">
                    {method.id === 'flash' && (
                      <svg className="w-5 h-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    )}
                    {method.id === 'express' && (
                      <svg className="w-5 h-5 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                    {method.id === 'pickup' && (
                      <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    )}
                    {method.id === 'standard' && (
                      <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                    )}
                    <span className="text-gray-900 font-medium">{method.name}</span>
                  </div>
                  <div className="text-gray-500 text-sm mt-1">{method.days}</div>
                </div>
              </div>
              <div className="text-right">
                {method.price === 0 ? (
                  <span className="text-green-600 font-semibold">Gratis</span>
                ) : (
                  <span className="text-gray-900 font-semibold">${method.price.toFixed(2)}</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
