"use client";

import Link from "next/link";
import { TrashIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { PhotoIcon } from "@heroicons/react/24/outline";
import { useCart } from "@/contexts/CartContext";
import { buildWhatsAppOrderLink } from "@/utils/whatsapp";
import { useProducts } from "@/contexts/ProductContext";
import { WHATSAPP_PHONE } from "@/config/constants";

export default function CartPage() {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    total
  } = useCart();
  const { trackOrderIntent } = useProducts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row items-end justify-between mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Tu Carrito</h1>
          <p className="text-gray-500 font-medium">Tienes {cartItems.length} {cartItems.length === 1 ? 'producto' : 'productos'} seleccionados</p>
        </div>
        {cartItems.length > 0 && (
          <button onClick={clearCart} className="text-sm font-bold text-red-500 hover:text-red-600 transition-colors px-4 py-2 rounded-xl hover:bg-red-50 uppercase tracking-widest">
            Vaciar Carrito
          </button>
        )}
      </div>

      {cartItems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="group relative bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500">
                <div className="flex gap-4 sm:gap-6">
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
                    <ImageWithFallback
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <Link href={`/productos/${item.slug}`} className="text-base sm:text-lg font-black text-gray-900 hover:text-emerald-600 transition-colors line-clamp-2 leading-tight">
                          {item.name}
                        </Link>
                        <p className="text-xl font-black text-emerald-600 mt-1">$ {item.price.toLocaleString('es-CL')}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Eliminar"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="inline-flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-100">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-emerald-600 disabled:opacity-20 transition-colors"
                        >
                          <MinusIcon className="h-4 w-4 stroke-[3]" />
                        </button>
                        <span className="w-10 text-center font-black text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-emerald-600 transition-colors"
                        >
                          <PlusIcon className="h-4 w-4 stroke-[3]" />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-gray-400">Total: <span className="text-gray-900">$ {(item.price * item.quantity).toLocaleString('es-CL')}</span></p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="pt-4">
              <Link href="/productos" className="inline-flex items-center gap-2 text-emerald-600 font-bold hover:gap-3 transition-all">
                <PlusIcon className="w-4 h-4 stroke-[3]" />
                Seguir comprando más delicias
              </Link>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-8 border border-gray-100 sticky top-24 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-50" />
              
              <div className="mb-8 p-6 bg-emerald-50/50 rounded-3xl border border-emerald-100 relative overflow-hidden z-10">
                {subtotal >= 30000 ? (
                  <div className="space-y-2">
                     <div className="flex items-center gap-2 text-emerald-700 font-black text-sm uppercase tracking-wider">
                       <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px]">✓</span>
                       ¡Envío Gratis Habilitado!
                     </div>
                     <p className="text-[11px] text-emerald-600/80 font-medium">Has alcanzado el monto mínimo para despacho gratuito.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex justify-between items-end">
                      <span className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">Envío gratis</span>
                      <span className="text-xs font-bold text-emerald-700">Faltan ${(30000 - subtotal).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="h-2 w-full bg-emerald-200/30 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                        style={{ width: `${Math.min((subtotal / 30000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight relative z-10">Resumen</h2>

              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-center text-gray-500">
                  <span className="font-bold text-sm uppercase tracking-widest text-[10px]">Subtotal</span>
                  <span className="text-lg font-black text-gray-900">$ {subtotal.toLocaleString('es-CL')}</span>
                </div>

                <div className="flex justify-between items-center text-gray-500">
                  <span className="font-bold text-sm uppercase tracking-widest text-[10px]">Envío estimado</span>
                  <span className="text-lg font-black text-emerald-600">
                    Calculado al pagar
                  </span>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total a pagar</span>
                    <span className="text-4xl font-black text-gray-900 tracking-tighter">$ {total.toLocaleString('es-CL')}</span>
                  </div>
                </div>

                <div className="pt-8 space-y-4">
                  <Link href="/checkout" className="block">
                    <Button fullWidth className="h-16 rounded-2xl text-lg font-black shadow-xl shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-500 border-none transition-all hover:scale-[1.02] active:scale-[0.98] text-white">
                      Finalizar Pedido
                    </Button>
                  </Link>

                  <div className="p-6 bg-emerald-950 rounded-[2rem] text-white border border-emerald-900 shadow-xl shadow-emerald-900/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2">Ayuda Inmediata</p>
                    <p className="text-sm font-bold opacity-90 mb-4 font-serif italic leading-snug">&quot;¿Tienes dudas con tu pedido? Estamos para apoyarte en lo que necesites.&quot;</p>
                    <Link 
                      href={`https://wa.me/${WHATSAPP_PHONE}?text=Hola!%20Tengo%20una%20consulta%20sobre%20mi%20carrito`} 
                      target="_blank" 
                      className="inline-flex items-center font-black text-emerald-300 hover:text-white transition-all text-xs"
                    >
                      Chat WhatsApp →
                    </Link>
                  </div>
                </div>

                <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center opacity-60">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-snug mb-2">
                    Pagos Seguros & Protegidos
                  </p>
                  <div className="flex justify-center gap-3 grayscale">
                     <div className="w-8 h-5 bg-gray-200 rounded" />
                     <div className="w-8 h-5 bg-gray-200 rounded" />
                     <div className="w-8 h-5 bg-gray-200 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] shadow-xl p-16 text-center border border-gray-100">
          <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrashIcon className="h-10 w-10 text-gray-300" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Tu carrito está vacío</h2>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto font-medium">Parece que aún no has agregado productos a tu carrito. ¡Explora nuestras delicias!</p>
          <Link href="/productos">
            <Button size="lg" className="rounded-2xl px-10 h-14 font-black">Ir a la tienda</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
