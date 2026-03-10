"use client";

import Link from "next/link";
import { TrashIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
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
    total,
    shippingCost
  } = useCart();
  const { trackOrderIntent } = useProducts();

  // Teléfono destino (configurable futuramente vía env o admin)
  const handleWhatsAppOrder = () => {
    if (cartItems.length === 0) return;
    // Track order intent para todos los productos del carrito
    cartItems.forEach(i => trackOrderIntent(i.id));
    const link = buildWhatsAppOrderLink({
      phone: WHATSAPP_PHONE,
      items: cartItems.map(ci => ({ name: ci.name, quantity: ci.quantity, price: ci.price })),
    });
    window.open(link, '_blank');
  };

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
          {/* Lista de productos */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <div key={item.id} className="group relative bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-500">
                <div className="flex gap-4 sm:gap-6">
                  {/* Imagen del producto */}
                  <div className="relative w-24 h-24 sm:w-32 sm:h-32 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 shadow-inner">
                    <ImageWithFallback
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>

                  {/* Detalles */}
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

                    {/* Controles de cantidad */}
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

          {/* Resumen Premium */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/50 p-8 border border-gray-100 sticky top-24 overflow-hidden">
              {/* Decoración sutil */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

              <h2 className="text-2xl font-black text-gray-900 mb-8 tracking-tight">Resumen</h2>

              <div className="space-y-6 relative z-10">
                <div className="flex justify-between items-center text-gray-500">
                  <span className="font-bold text-sm uppercase tracking-widest">Subtotal</span>
                  <span className="text-lg font-black text-gray-900">$ {subtotal.toLocaleString('es-CL')}</span>
                </div>

                <div className="flex justify-between items-center text-gray-500">
                  <span className="font-bold text-sm uppercase tracking-widest">Envío estimado</span>
                  <span className="text-lg font-black text-emerald-600">
                    {shippingCost === 0 ? "Gratis" : `$ ${shippingCost.toLocaleString('es-CL')}`}
                  </span>
                </div>

                <div className="pt-6 border-t border-gray-100 flex justify-between items-end">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total a pagar</span>
                    <span className="text-4xl font-black text-gray-900 tracking-tighter">$ {total.toLocaleString('es-CL')}</span>
                  </div>
                </div>

                <div className="pt-8 space-y-4">
                  <Link href="/checkout">
                    <Button fullWidth className="h-16 rounded-2xl text-lg font-black shadow-xl shadow-emerald-600/20 bg-emerald-600 hover:bg-emerald-500 border-none transition-all hover:scale-[1.02] active:scale-[0.98]">
                      Finalizar Pedido
                    </Button>
                  </Link>
                  <Button
                    fullWidth
                    variant="outline"
                    onClick={handleWhatsAppOrder}
                    className="h-16 rounded-2xl text-lg font-bold border-2 border-emerald-100 text-emerald-600 hover:bg-emerald-50 transition-all"
                  >
                    Pedir por WhatsApp
                  </Button>
                </div>

                <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-center">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-snug">
                    Pagos Seguros & Protegidos
                  </p>
                  <div className="flex justify-center gap-2 mt-2 opacity-30 grayscale saturate-0">
                    <div className="w-10 h-6 bg-gray-300 rounded" />
                    <div className="w-10 h-6 bg-gray-300 rounded" />
                    <div className="w-10 h-6 bg-gray-300 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <svg
            className="mx-auto h-16 w-16 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
          <h2 className="mt-4 text-lg font-medium text-gray-900">Tu carrito está vacío</h2>
          <p className="mt-2 text-gray-500">Parece que aún no has agregado productos a tu carrito.</p>
          <div className="mt-6">
            <Link href="/productos">
              <Button>Ir a la tienda</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
