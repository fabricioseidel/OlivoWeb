"use client";

import React from 'react';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { useSiteCopy } from '@/hooks/useSiteCopy';

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
  const { t } = useSiteCopy();

  return (
    <fieldset>
      <legend className="o-h3 mb-4 text-neutral-900">{t('checkout.paymentTitle')}</legend>

      <div className="space-y-2.5">
        {paymentMethods.map((method) => {
          const isSelected = selectedMethod === method.id;
          const isMercadoPago = method.id === 'mercadopago';

          return (
            <label
              key={method.id}
              htmlFor={method.id}
              className={`flex cursor-pointer items-center gap-3.5 rounded-xl border p-4 transition-colors ${
                isSelected
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : 'border-neutral-200 bg-white hover:border-neutral-300'
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

              <span
                aria-hidden="true"
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                  isSelected ? 'border-emerald-600 bg-emerald-600' : 'border-neutral-300 bg-white'
                }`}
              >
                {isSelected && <span className="size-1.5 rounded-full bg-white" />}
              </span>

              {isMercadoPago && (
                <span className="flex h-9 w-14 shrink-0 items-center justify-center rounded-lg bg-[#009EE3] text-center text-[10px] font-semibold leading-tight text-white">
                  Mercado
                  <br />
                  Pago
                </span>
              )}

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-900">{method.name}</span>
                {isMercadoPago && (
                  <span className="mt-0.5 block text-xs leading-relaxed text-neutral-500">
                    Débito, crédito, transferencia o saldo en MercadoPago
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-neutral-500">
        <LockClosedIcon className="mt-0.5 size-3.5 shrink-0" />
        {t('checkout.securityNote')}
      </p>
    </fieldset>
  );
}
