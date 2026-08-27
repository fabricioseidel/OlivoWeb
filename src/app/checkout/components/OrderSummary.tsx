"use client";

import React, { useState } from 'react';
import { CartItem } from '@/types';
import { CheckCircleIcon, XCircleIcon, TicketIcon, StarIcon } from "@heroicons/react/24/outline";

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

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

/**
 * Resumen del pedido.
 *
 * En el último paso antes de pagar, el cliente necesita verificar tres cosas
 * sin esfuerzo: qué lleva, cuánto suma y qué se le descuenta. Por eso el único
 * número en peso fuerte es el total, y va en gris oscuro y no en verde: el
 * verde aquí se reserva para los descuentos, que es lo que baja el monto.
 */
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

  const pointsDiscount = redeemedPoints * redemptionValue;

  return (
    <div>
      <h2 className="o-h3 mb-5 text-neutral-900">Resumen del pedido</h2>

      {/* Productos */}
      <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {cartItems.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element -- imagen dinámica externa, sin dimensiones conocidas */}
              <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border-2 border-white bg-neutral-800 text-[11px] font-semibold text-white">
                {item.quantity}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-snug text-neutral-900">{item.name}</p>
              <p className="tabular text-xs text-neutral-500">{clp(item.price)} c/u</p>
            </div>
            <p className="tabular shrink-0 text-sm font-medium text-neutral-900">
              {clp(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      {/* Montos */}
      <dl className="mt-5 space-y-2.5 border-t border-neutral-100 pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-sm text-neutral-600">Subtotal</dt>
          <dd className="tabular text-sm font-medium text-neutral-900">{clp(subtotal)}</dd>
        </div>

        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-sm text-neutral-600">Envío</dt>
          <dd className="tabular text-sm font-medium">
            {appliedCoupon?.freeShipping ? (
              <span className="text-brand-700">Gratis con cupón</span>
            ) : shippingCost === 0 ? (
              <span className="text-brand-700">Gratis</span>
            ) : (
              <span className="text-neutral-900">{clp(shippingCost)}</span>
            )}
          </dd>
        </div>

        {appliedCoupon && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="flex min-w-0 items-center gap-1.5 text-sm text-brand-700">
              <TicketIcon className="size-4 shrink-0" />
              <span className="truncate">Cupón {appliedCoupon.code}</span>
              <button
                onClick={onRemoveCoupon}
                aria-label={`Quitar el cupón ${appliedCoupon.code}`}
                className="o-focus shrink-0 rounded text-neutral-400 transition-colors hover:text-red-600"
              >
                <XCircleIcon className="size-4" />
              </button>
            </dt>
            {appliedCoupon.discount > 0 && (
              <dd className="tabular text-sm font-medium text-brand-700">
                −{clp(appliedCoupon.discount)}
              </dd>
            )}
          </div>
        )}

        {redeemedPoints > 0 && (
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-sm text-brand-700">Puntos canjeados</dt>
            <dd className="tabular text-sm font-medium text-brand-700">−{clp(pointsDiscount)}</dd>
          </div>
        )}
      </dl>

      {/* Puntos de fidelidad */}
      {loyaltyPoints >= minRedeem && onRedeemPoints && (
        <div className="mt-4 rounded-xl border border-neutral-200 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
                <StarIcon className="size-4 shrink-0 text-amber-500" />
                Tienes {loyaltyPoints} puntos
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {redeemedPoints > 0
                  ? `Estás usando ${redeemedPoints} puntos en este pedido.`
                  : `Equivalen a ${clp(loyaltyPoints * redemptionValue)} de descuento.`}
              </p>
            </div>
            <button
              onClick={() => onRedeemPoints(redeemedPoints > 0 ? 0 : loyaltyPoints)}
              className="o-focus shrink-0 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:border-brand-400 hover:text-brand-700"
            >
              {redeemedPoints > 0 ? "Quitar" : "Usar"}
            </button>
          </div>
        </div>
      )}

      {/* Cupón */}
      {!appliedCoupon && (
        <div className="mt-4">
          <label htmlFor="coupon" className="sr-only">Código de cupón</label>
          <div className="flex gap-2">
            <input
              id="coupon"
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApply(); } }}
              placeholder="Código de descuento"
              className={`h-11 min-w-0 flex-1 rounded-xl border px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 ${
                feedback?.type === 'error'
                  ? 'border-red-300 focus:border-red-500'
                  : 'border-neutral-200 focus:border-brand-500'
              }`}
            />
            <button
              onClick={handleApply}
              disabled={isValidating || !couponCode.trim()}
              className="o-focus h-11 shrink-0 rounded-xl bg-neutral-900 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
            >
              {isValidating ? "…" : "Aplicar"}
            </button>
          </div>
          {feedback && (
            <p
              className={`mt-2 flex items-center gap-1.5 text-xs ${
                feedback.type === 'success' ? 'text-brand-700' : 'text-red-600'
              }`}
            >
              {feedback.type === 'success'
                ? <CheckCircleIcon className="size-3.5 shrink-0" />
                : <XCircleIcon className="size-3.5 shrink-0" />}
              {feedback.msg}
            </p>
          )}
        </div>
      )}

      {/* Total */}
      <div className="mt-5 flex items-baseline justify-between gap-3 border-t border-neutral-200 pt-5">
        <span className="text-[15px] font-semibold text-neutral-900">Total</span>
        <span className="tabular text-2xl font-bold text-neutral-900">{clp(total)}</span>
      </div>
    </div>
  );
}
