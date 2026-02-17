import React from 'react';
import { CartItem } from '@/types';

interface OrderSummaryProps {
  cartItems: CartItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
}

export default function OrderSummary({ cartItems, subtotal, shippingCost, total }: OrderSummaryProps) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 sticky top-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-4 border-b border-gray-200">
        Resumen del Pedido
      </h2>

      {/* Items del carrito */}
      <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
        {cartItems.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover"
              />
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-medium">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
              <p className="text-xs text-gray-500">${item.price.toFixed(2)} c/u</p>
            </div>
            <p className="text-sm font-semibold text-gray-900">
              ${(item.price * item.quantity).toFixed(2)}
            </p>
          </div>
        ))}
      </div>

      {/* Totales */}
      <div className="space-y-3 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm">
          <p className="text-gray-600">Subtotal</p>
          <p className="font-medium text-gray-900">${subtotal.toFixed(2)}</p>
        </div>

        <div className="flex justify-between text-sm">
          <p className="text-gray-600">Envío</p>
          <p className="font-medium text-gray-900">
            {shippingCost === 0 ? (
              <span className="text-green-600">Gratis</span>
            ) : (
              `$${shippingCost.toFixed(2)}`
            )}
          </p>
        </div>

        <div className="pt-3 border-t border-gray-200 flex justify-between">
          <p className="text-lg font-semibold text-gray-900">Total</p>
          <p className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</p>
        </div>
      </div>

      {/* Seguridad */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center text-xs text-gray-500">
          <svg className="w-4 h-4 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Compra segura y cifrada
        </div>
      </div>
    </div>
  );
}
