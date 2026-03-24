import React from 'react';
import Input from "@/components/ui/Input";

export interface PaymentMethod {
  id: string;
  name: string;
}

interface PaymentFormProps {
  paymentMethods: PaymentMethod[];
  selectedMethod: string;
  onMethodChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PaymentForm({
  paymentMethods,
  selectedMethod,
  onMethodChange
}: PaymentFormProps) {
  return (
    <div className="p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-6">Información de Pago</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-medium text-gray-900 mb-4">Método de Pago</h3>
          
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center">
                <input
                  id={method.id}
                  name="paymentMethod"
                  type="radio"
                  value={method.id}
                  checked={selectedMethod === method.id}
                  onChange={onMethodChange}
                  className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <label htmlFor={method.id} className="ml-3">
                  <span className="text-gray-900 font-medium">{method.name}</span>
                </label>
              </div>
            ))}
          </div>
        </div>
        
        {/* 
            Los campos de tarjeta se han removido ya que el pago se procesa 
            externamente a través de las pasarelas de Transbank o MercadoPago.
        */}
      </div>
    </div>
  );
}
