"use client";

import React, { useState } from 'react';
import { CartItem } from '@/types';
import { ShoppingBagIcon, CheckCircleIcon, XCircleIcon, TicketIcon } from "@heroicons/react/24/outline";

interface OrderSummaryProps {
  cartItems: CartItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  onApplyCoupon: (code: string) => Promise<{ valid: boolean; message: string; discount: number; freeShipping?: boolean }>;
  appliedCoupon?: { code: string; discount: number; freeShipping?: boolean } | null;
  onRemoveCoupon: () => void;
  loyaltyPoints?: number;
  redeemedPoints?: number;
  onRedeemPoints?: (points: number) => void;
  redemptionValue?: number;
  minRedeem?: number;
}

export default function OrderSummary({ 
  cartItems, 
  subtotal, 
  shippingCost, 
  total, 
  onApplyCoupon, 
  appliedCoupon,
  onRemoveCoupon,
  loyaltyPoints = 0,
  redeemedPoints = 0,
  onRedeemPoints,
  redemptionValue = 0,
  minRedeem = 50,
}: OrderSummaryProps) {
  const [couponCode, setCouponCode] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success', msg: string } | null>(null);

  const handleApply = async () => {
    if (!couponCode.trim()) return;
    setIsValidating(true);
    setFeedback(null);
    try {
      const result = await onApplyCoupon(couponCode);
      if (result.valid) {
        setFeedback({ type: 'success', msg: result.message });
        setCouponCode("");
      } else {
        setFeedback({ type: 'error', msg: result.message });
      }
    } catch {
      setFeedback({ type: 'error', msg: "Error al aplicar el cupón" });
    } finally {
      setIsValidating(false);
    }
  };

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
          <div className="text-right">
             <p className={`font-black ${appliedCoupon?.freeShipping ? 'line-through text-gray-300 text-xs' : 'text-emerald-600'}`}>
                {shippingCost === 0 ? "Gratis" : `$${shippingCost.toLocaleString('es-CL')}`}
             </p>
             {appliedCoupon?.freeShipping && (
                <p className="text-emerald-600 font-black text-sm">Gratis (Cupón)</p>
             )}
          </div>
        </div>

        {appliedCoupon && (
           <div className="flex justify-between items-center text-sm animate-in fade-in zoom-in duration-300">
              <div className="flex items-center gap-2">
                 <TicketIcon className="h-4 w-4 text-emerald-600" />
                 <span className="text-emerald-600 font-black uppercase tracking-[0.1em] text-[10px]">
                    CUPÓN: {appliedCoupon.code}
                 </span>
                 <button onClick={onRemoveCoupon} className="text-red-400 hover:text-red-600 ml-1">
                    <XCircleIcon className="h-4 w-4" />
                 </button>
              </div>
              {appliedCoupon.discount > 0 && (
                 <p className="font-black text-emerald-600">-${appliedCoupon.discount.toLocaleString('es-CL')}</p>
              )}
           </div>
        )}

        {/* Canje de Puntos Loyalty */}
        {loyaltyPoints >= minRedeem && onRedeemPoints && (
           <div className="pt-2">
              <div className={`p-4 rounded-2xl border-2 transition-all ${redeemedPoints > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-100'}`}>
                 <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                       <span className="text-amber-500">⭐</span>
                       <span className="text-[10px] font-black uppercase tracking-widest text-gray-900">Tus Puntos: {loyaltyPoints}</span>
                    </div>
                    {redeemedPoints > 0 ? (
                       <button 
                          onClick={() => onRedeemPoints(0)}
                          className="text-[10px] font-black text-amber-600 hover:text-amber-700 underline"
                       >
                          CANCELAR
                       </button>
                    ) : (
                       <button 
                          onClick={() => onRedeemPoints(loyaltyPoints)}
                          className="text-[10px] font-black text-amber-600 hover:text-amber-700 underline"
                       >
                          USAR TODOS
                       </button>
                    )}
                 </div>
                 {redeemedPoints > 0 ? (
                    <div className="flex justify-between items-center text-amber-700">
                       <p className="text-xs font-bold">Descuento aplicado</p>
                       <p className="font-black">-${(redeemedPoints * redemptionValue).toLocaleString('es-CL')}</p>
                    </div>
                 ) : (
                    <p className="text-[9px] text-gray-400 font-medium">Puedes canjear tus puntos por un descuento de ${(loyaltyPoints * redemptionValue).toLocaleString('es-CL')}</p>
                 )}
              </div>
           </div>
        )}

        {/* Campo de Cupón Premium */}
        {!appliedCoupon && (
           <div className="py-2">
            <div className="relative group">
              <input 
                type="text" 
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="¿Tienes un cupón?" 
                className={`w-full h-12 px-5 pr-12 rounded-xl bg-gray-50 border-2 outline-none text-xs font-bold transition-all text-gray-900 ${feedback?.type === 'error' ? 'border-red-100 focus:border-red-300' : 'border-transparent focus:border-emerald-500/10 focus:bg-white'}`}
              />
              <button 
                onClick={handleApply}
                disabled={isValidating || !couponCode.trim()}
                className="absolute right-2 top-2 h-8 px-4 bg-gray-900 text-white rounded-lg text-[10px] font-black hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {isValidating ? "..." : "APLICAR"}
              </button>
            </div>
            {feedback && (
               <p className={`text-[10px] font-black mt-2 px-1 flex items-center gap-1 ${feedback.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                  {feedback.type === 'success' ? <CheckCircleIcon className="h-3 w-3" /> : <XCircleIcon className="h-3 w-3" />}
                  {feedback.msg}
               </p>
            )}
          </div>
        )}

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
