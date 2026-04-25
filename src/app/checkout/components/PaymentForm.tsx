import React from 'react';
import { ShieldCheckIcon, LockClosedIcon } from '@heroicons/react/24/solid';

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
    <div className="space-y-4">
      <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
        Método de Pago
      </h3>

      <div className="space-y-3">
        {paymentMethods.map((method) => {
          const isSelected = selectedMethod === method.id;
          const isMercadoPago = method.id === 'mercadopago';

          return (
            <label
              key={method.id}
              htmlFor={method.id}
              className={`relative flex items-center gap-5 p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/60 shadow-lg shadow-emerald-500/10'
                  : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
              }`}
            >
              <input
                id={method.id}
                name="paymentMethod"
                type="radio"
                value={method.id}
                checked={isSelected}
                onChange={onMethodChange}
                className="sr-only"
              />

              {/* Radio Visual */}
              <div
                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                  isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-gray-300 bg-white'
                }`}
              >
                {isSelected && (
                  <div className="h-2 w-2 rounded-full bg-white" />
                )}
              </div>

              {/* Logo / Icono */}
              {isMercadoPago && (
                <div className="flex items-center justify-center h-11 w-16 bg-[#009EE3] rounded-xl flex-shrink-0 shadow-sm">
                  <span className="text-white font-black text-[10px] leading-tight text-center px-1">
                    Mercado<br />Pago
                  </span>
                </div>
              )}

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p className={`font-black text-sm tracking-tight ${isSelected ? 'text-emerald-800' : 'text-gray-800'}`}>
                  {method.name}
                </p>
                {isMercadoPago && (
                  <p className="text-xs text-gray-500 font-medium mt-0.5 leading-relaxed">
                    Tarjeta de débito, crédito, transferencia o billetera virtual
                  </p>
                )}
              </div>

              {/* Badge seleccionado */}
              {isSelected && (
                <div className="flex-shrink-0 flex items-center gap-1 bg-emerald-100 text-emerald-700 rounded-full px-3 py-1">
                  <ShieldCheckIcon className="h-3 w-3" />
                  <span className="text-[10px] font-black uppercase tracking-wide">Seleccionado</span>
                </div>
              )}
            </label>
          );
        })}
      </div>

      {/* Aviso de seguridad */}
      <div className="flex items-center gap-2 pt-2 pl-1">
        <LockClosedIcon className="h-3 w-3 text-gray-400 flex-shrink-0" />
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          Pago 100% seguro · Serás redirigido al gateway oficial de MercadoPago
        </p>
      </div>
    </div>
  );
}
