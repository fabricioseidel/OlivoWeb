"use client";

import { useState } from "react";
import Link from "next/link";
import { TrashIcon, MinusIcon, PlusIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";
import { buildWhatsAppOrderLink } from "@/utils/whatsapp";
import { useProducts } from "@/contexts/ProductContext";
import { WHATSAPP_PHONE } from "@/config/constants";

// Simulación de datos del carrito
const initialCartItems = [
  {
    id: "1",
    name: "Smartphone XYZ",
    price: 299.99,
    image: "https://images.unsplash.com/photo-1598327105666-5b89351aff97?q=80&w=2127&auto=format&fit=crop",
    slug: "smartphone-xyz",
    quantity: 1,
  },
  {
    id: "2",
    name: "Auriculares Bluetooth",
    price: 89.99,
    image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=2070&auto=format&fit=crop",
    slug: "auriculares-bluetooth",
    quantity: 2,
  }
];

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
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Carrito de Compras</h1>

      {cartItems.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de productos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {cartItems.map((item) => (
                  <li key={item.id} className="p-6">
                    <div className="flex flex-col sm:flex-row items-center">
                      {/* Imagen */}
                      <div className="w-full sm:w-24 h-24 flex-shrink-0 mb-4 sm:mb-0">
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>

                      {/* Información */}
                      <div className="flex-1 ml-0 sm:ml-6 text-center sm:text-left">
                        <Link href={`/productos/${item.slug}`} className="text-lg font-bold text-gray-900 hover:text-emerald-600 transition-colors">
                          {item.name}
                        </Link>
                        <p className="mt-1 text-emerald-600 font-bold">$ {item.price.toFixed(2)}</p>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center mt-4 sm:mt-0 gap-4">
                        <div className="flex items-center border border-gray-200 rounded-xl">
                          <button
                            type="button"
                            className="p-2 hover:bg-gray-50 rounded-l-xl text-gray-500 transition-colors"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <MinusIcon className="h-4 w-4" />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                            className="w-12 text-center border-none focus:ring-0 text-gray-900 font-semibold bg-transparent"
                          />
                          <button
                            type="button"
                            className="p-2 hover:bg-gray-50 rounded-r-xl text-gray-500 transition-colors"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <PlusIcon className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Botón eliminar */}
                        <button
                          type="button"
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 rounded-lg"
                          onClick={() => removeFromCart(item.id)}
                          title="Eliminar producto"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {/* Botones de acción */}
              <div className="bg-gray-50 p-6 flex justify-between rounded-b-xl border-t border-gray-100">
                <Button variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={clearCart}>
                  Vaciar Carrito
                </Button>
                <Link href="/productos">
                  <Button variant="outline">
                    Continuar Comprando
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Resumen */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sticky top-24">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen del Pedido</h2>

              <div className="space-y-4">
                <div className="flex justify-between text-gray-600">
                  <p>Subtotal</p>
                  <p className="font-medium text-gray-900">$ {subtotal.toFixed(2)}</p>
                </div>

                <div className="flex justify-between text-gray-600">
                  <p>Envío estimado</p>
                  <p className="font-medium text-gray-900">$ {shippingCost.toFixed(2)}</p>
                </div>

                <div className="border-t border-gray-100 pt-4 flex justify-between items-end">
                  <p className="text-lg font-bold text-gray-900">Total</p>
                  <p className="text-2xl font-bold text-emerald-600">$ {total.toFixed(2)}</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Link href="/checkout">
                  <Button fullWidth size="lg">
                    Proceder al Pago
                  </Button>
                </Link>
                <Button fullWidth variant="outline" onClick={handleWhatsAppOrder}>
                  Pedir por WhatsApp
                </Button>
              </div>

              <div className="mt-4 text-center text-sm text-gray-500">
                <p>Aceptamos MercadoPago, tarjetas de crédito/débito y transferencias bancarias</p>
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
