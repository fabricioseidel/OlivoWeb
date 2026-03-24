import React from 'react';
import { CartItem } from '@/types';
import { ShoppingBagIcon } from "@heroicons/react/24/outline";

interface OrderSummaryProps {
  cartItems: CartItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
}

export default function OrderSummary({ cartItems, subtotal, shippingCost, total }: OrderSummaryProps) {
  return (
    <div className="space-y-6">
      <h3 className="text-xl font-black text-gray-900 flex items-center gap-2 mb-6">
        <ShoppingBagIcon className="h-5 w-5 text-emerald-600" />
        Resumen del Pedido
      </h3>

      {/* Items del pedido */}
      <div className="space-y-4 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
        {cartItems.map((item) => (
          <div key={item.id} className="flex gap-4 group">
            <div className="relative h-14 w-14 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex-shrink-0">
              <img
                src={item.image}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <span className="absolute -top-1 -right-1 bg-gray-900 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-black border-2 border-white">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate leading-tight mb-1">{item.name}</p>
              <p className="text-xs text-gray-400 font-medium tracking-tight">
                {item.quantity} x ${item.price.toLocaleString('es-CL')}
              </p>
            </div>
            <p className="text-sm font-black text-gray-900">
              ${(item.price * item.quantity).toLocaleString('es-CL')}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-4 pt-6 border-t border-gray-100">
        <div className="flex justify-between items-center text-sm">
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Subtotal</p>
          <p className="font-bold text-gray-900">${subtotal.toLocaleString('es-CL')}</p>
        </div>

        <div className="flex justify-between items-center text-sm">
          <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Envío</p>
          <p className="font-black text-emerald-600">
            {shippingCost === 0 ? "Gratis" : `$${shippingCost.toLocaleString('es-CL')}`}
          </p>
        </div>

        {/* Campo de Cupón Premium */}
        <div className="py-2">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="¿Tienes un cupón?" 
              className="w-full h-12 px-5 pr-12 rounded-xl bg-gray-50 border-2 border-transparent focus:border-emerald-500/10 focus:bg-white outline-none text-xs font-bold transition-all text-gray-900"
            />
            <button className="absolute right-2 top-2 h-8 px-4 bg-gray-900 text-white rounded-lg text-[10px] font-black hover:bg-emerald-600 transition-colors">
              APLICAR
            </button>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 leading-none">Total</span>
            <span className="text-3xl font-black text-emerald-600 tracking-tighter leading-none">${total.toLocaleString('es-CL')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
