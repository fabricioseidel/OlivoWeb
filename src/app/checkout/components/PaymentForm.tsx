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
        
        {/* Campos específicos para tarjeta de crédito/débito */}
        {(selectedMethod === "credit_card" || selectedMethod === "debit_card") && (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Input
                label="Número de tarjeta"
                id="cardNumber"
                name="cardNumber"
                type="text"
                placeholder="1234 5678 9012 3456"
                required
              />
            </div>
            
            <div className="sm:col-span-2">
              <Input
                label="Nombre en la tarjeta"
                id="cardName"
                name="cardName"
                type="text"
                required
              />
            </div>
            
            <div>
              <Input
                label="Fecha de expiración (MM/AA)"
                id="cardExpiry"
                name="cardExpiry"
                type="text"
                placeholder="MM/AA"
                required
              />
            </div>
            
            <div>
              <Input
                label="Código de seguridad (CVV)"
                id="cardCvv"
                name="cardCvv"
                type="text"
                placeholder="123"
                required
              />
            </div>
          </div>
        )}
        
        {/* Campos específicos para transferencia */}
        {selectedMethod === "bank_transfer" && (
          <div className="bg-blue-50 p-4 rounded-md">
            <p className="text-sm text-gray-700">
              Después de completar el pedido, recibirás un correo electrónico con los datos bancarios para realizar la transferencia.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
