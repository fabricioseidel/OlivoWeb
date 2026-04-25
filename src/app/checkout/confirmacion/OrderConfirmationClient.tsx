"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckIcon,
  ShoppingBagIcon,
  ChatBubbleBottomCenterTextIcon,
  ArrowRightIcon,
  ClockIcon,
  TruckIcon
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/contexts/ToastContext";

export default function OrderConfirmationClient() {
  const { clearCart } = useCart();
  const { showToast } = useToast();
  const [order, setOrder] = useState<any | null>(null);
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const paymentStatus = searchParams.get("payment"); // 'success' | 'failure' | 'pending'

  useEffect(() => {
    if (orderId) {
      clearCart();
      fetch(`/api/orders/${orderId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setOrder(data);
          else setOrder({ id: orderId, created_at: new Date().toISOString(), total: 0, status: "confirmado" });
        })
        .catch(() => setOrder({ id: orderId, created_at: new Date().toISOString(), total: 0, status: "confirmado" }));
    }
  }, [orderId, clearCart]);

  if (!orderId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tight">No encontramos tu pedido 🕵️‍♂️</h2>
        <p className="text-gray-500 mb-8">Si crees que esto es un error, por favor contáctanos.</p>
        <Link href="/">
          <Button className="rounded-2xl px-10 h-14 font-black bg-emerald-600 hover:bg-emerald-500">Volver a la tienda</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 md:py-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Celebración Card */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-emerald-900/10 overflow-hidden border border-emerald-50 relative">
          {/* Decoración Superior */}
          <div className="h-2 bg-gradient-to-r from-emerald-400 via-emerald-600 to-emerald-400" />
          
          <div className="p-8 md:p-16 text-center">
            <div className="relative inline-block mb-10">
               <div className="absolute inset-0 bg-emerald-500 rounded-full blur-2xl opacity-20 animate-pulse" />
               <div className="relative mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-emerald-600 text-white shadow-xl shadow-emerald-500/40">
                <CheckIcon className="h-12 w-12 stroke-[3]" />
              </div>
            </div>

            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tighter">
               {paymentStatus === 'failure' ? (
                 <>Pago <span className="text-red-500">Fallido</span></>
               ) : paymentStatus === 'pending' ? (
                 <>Pago <span className="text-amber-500">Pendiente</span></>
               ) : (
                 <>¡Pago <span className="text-emerald-600">Completado!</span></>
               )}
            </h1>
            <p className="text-lg text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
              {paymentStatus === 'failure' ? (
                <>Tu pago no pudo procesarse. El pedido <strong>#{orderId}</strong> fue registrado pero está pendiente de pago. Puedes volver a intentarlo o contactarnos.</>
              ) : paymentStatus === 'pending' ? (
                <>Tu pago está siendo procesado. El pedido <strong>#{orderId}</strong> será confirmado una vez acreditado el pago.</>
              ) : (
                <>Es oficial, el pedido <strong>#{orderId}</strong> ya está en nuestro radar. Te hemos enviado un email con todos los detalles de tu compra.</>
              )}
            </p>

            {/* Timeline simple */}
            <div className="mt-16 max-w-2xl mx-auto">
               <div className="grid grid-cols-3 gap-4 relative">
                  <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-100 -z-10" />
                  
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/20 border-4 border-white">
                       <CheckIcon className="h-5 w-5 stroke-[3]" />
                    </div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-emerald-600">Confirmado</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-xl bg-white text-gray-300 flex items-center justify-center border-2 border-gray-100">
                       <ClockIcon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Preparando</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-xl bg-white text-gray-300 flex items-center justify-center border-2 border-gray-100">
                       <TruckIcon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-gray-400">En camino</p>
                  </div>
               </div>
            </div>

            {/* Acciones */}
            <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 gap-4">
               <Link href="/mi-cuenta/pedidos" className="flex items-center justify-center gap-3 px-8 h-16 rounded-2xl bg-gray-900 text-white font-black hover:bg-black transition-all group">
                 Ver mi Pedido
                 <ArrowRightIcon className="h-4 w-4 group-hover:translate-x-2 transition-transform" />
               </Link>
               <Link href="/productos" className="flex items-center justify-center gap-3 px-8 h-16 rounded-2xl bg-white border-2 border-gray-100 text-gray-900 font-black hover:border-emerald-500 hover:text-emerald-600 transition-all">
                 <ShoppingBagIcon className="h-5 w-5" />
                 Seguir Comprando
               </Link>
            </div>
          </div>

          {/* Banner Soporte */}
          <div className="bg-emerald-50 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
             <div className="flex items-center gap-4 text-left">
                <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center text-emerald-600 shadow-sm">
                   <ChatBubbleBottomCenterTextIcon className="h-7 w-7" />
                </div>
                <div>
                   <p className="text-sm font-black text-gray-900 uppercase tracking-tighter">¿Alguna consulta especial?</p>
                   <p className="text-xs text-emerald-800/70 font-medium font-serif italic">&quot;Nuestro equipo está listo para ayudarte con tu despacho.&quot;</p>
                </div>
             </div>
             <a 
               href={`https://wa.me/56912345678?text=Hola%20OlivoMarket!%20Tengo%20una%20pregunta%20sobre%20mi%20pedido%20${orderId}`}
               target="_blank"
               className="bg-emerald-600 text-white px-8 h-12 rounded-xl flex items-center font-black text-xs uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/10"
             >
                Chat WhatsApp
             </a>
          </div>
        </div>

        {/* Decoración Footer */}
        <p className="mt-12 text-center text-[10px] uppercase font-black tracking-[0.3em] text-gray-300">
          OlivoMarket · Calidad Gourmet Garantizada
        </p>
      </div>
    </div>
  );
}
