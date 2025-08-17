"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { CheckCircleIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useCart } from "@/contexts/CartContext";

type Order = {
  id: string;
  fecha: string; // YYYY-MM-DD
  total: number;
  estado: string;
  productos: number;
  items: any[];
  customer?: string;
  email?: string;
  userId?: string; // opcional para futuros filtros
  createdAt: string; // ISO completo
  shippingAddress?: {
    nombre?: string;
    calle?: string;
    numero?: string;
    interior?: string;
    colonia?: string;
    ciudad?: string;
    estado?: string;
    codigoPostal?: string;
    telefono?: string;
  };
};

export default function OrderConfirmationPage() {
  const { cartItems, clearCart } = useCart();
  const { data: session } = useSession();
  const [order, setOrder] = useState<Order | null>(null);
  
  useEffect(() => {
    // Solo guardar el pedido si el carrito tiene productos y no existe ya el id en localStorage
    if (cartItems && cartItems.length > 0) {
      const validCartItems = cartItems.filter(item => 
        item && typeof item === 'object' && typeof item.price === 'number' && typeof item.quantity === 'number'
      );
      if (validCartItems.length > 0) {
        const subtotal = validCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const shippingCost = 10.00;
        const total = subtotal + shippingCost;
        const nowISO = new Date().toISOString();
        // Snapshot de dirección predeterminada del usuario (si existe)
        let shippingAddress: Order['shippingAddress'] | undefined = undefined;
        try {
          const defaultAddrRaw = localStorage.getItem('defaultAddress');
          if (defaultAddrRaw) {
            const def = JSON.parse(defaultAddrRaw);
            if (def && typeof def === 'object') {
              shippingAddress = {
                nombre: def.nombre,
                calle: def.calle,
                numero: def.numero,
                interior: def.interior,
                colonia: def.colonia,
                ciudad: def.ciudad,
                estado: def.estado,
                codigoPostal: def.codigoPostal,
                telefono: def.telefono,
              };
            }
          } else {
            const addressesRaw = localStorage.getItem('addresses');
            if (addressesRaw) {
              const list = JSON.parse(addressesRaw);
              if (Array.isArray(list) && list.length) {
                const first = list[0];
                shippingAddress = {
                  nombre: first.nombre,
                  calle: first.calle,
                  numero: first.numero,
                  interior: first.interior,
                  colonia: first.colonia,
                  ciudad: first.ciudad,
                  estado: first.estado,
                  codigoPostal: first.codigoPostal,
                  telefono: first.telefono,
                };
              }
            }
          }
        } catch {}

        const newOrder: Order = {
          id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
          fecha: new Date().toISOString().split("T")[0],
          total: total,
          estado: "En proceso",
          productos: validCartItems.reduce((sum, item) => sum + item.quantity, 0),
          items: validCartItems.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            slug: item.slug
          })),
          customer: session?.user?.name || 'Invitado',
          email: session?.user?.email || undefined,
          userId: (session as any)?.user?.id || undefined,
          createdAt: nowISO,
          shippingAddress,
        };
        // Solo guardar si no existe ya un pedido con los mismos productos y fecha
        if (typeof window !== 'undefined') {
          const existingOrders: Order[] = JSON.parse(localStorage.getItem('orders') || '[]');
          const last = existingOrders[0];
          let isQuickDuplicate = false;
          if (last) {
            const lastTime = last.createdAt ? new Date(last.createdAt).getTime() : 0;
            const nowTime = new Date(newOrder.createdAt).getTime();
            // Solo bloquear si es el MISMO contenido en <=5s (probable doble submit)
            if (nowTime - lastTime <= 5000 && JSON.stringify(last.items) === JSON.stringify(newOrder.items)) {
              isQuickDuplicate = true;
            }
          }
          if (!isQuickDuplicate) {
            localStorage.setItem('orders', JSON.stringify([newOrder, ...existingOrders]));
          }
        }
        setOrder(newOrder);
        clearCart();
        return;
      }
    }
    // Si no hay items válidos en el carrito, crear un pedido ficticio para mostrar
    const orderNumber = "ORD-" + Math.floor(100000 + Math.random() * 900000);
    setOrder({
      id: orderNumber,
      fecha: new Date().toISOString().split("T")[0],
      total: 0,
      estado: "Completado",
      productos: 0,
      items: [],
      createdAt: new Date().toISOString(),
  shippingAddress: undefined,
    });
  }, [cartItems, clearCart]);

  if (!order) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500" />
        
        <h1 className="mt-4 text-2xl font-bold text-gray-900">¡Pedido Confirmado!</h1>
        
        <p className="mt-2 text-lg text-gray-600">
          Gracias por tu compra. Tu pedido ha sido recibido y está siendo procesado.
        </p>
        
        <div className="mt-6 border border-gray-200 rounded-md p-4 bg-gray-50">
          <p className="text-gray-600">Número de pedido:</p>
          <p className="text-xl font-bold text-gray-900">{order.id}</p>
        </div>
        
        <div className="mt-8 text-left">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Detalles del pedido:</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Fecha de pedido</h3>
              <p className="text-gray-900">{new Date(order.fecha).toLocaleDateString()}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Total</h3>
              <p className="text-gray-900">${order.total.toFixed(2)}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-500">Productos</h3>
              <p className="text-gray-900">{order.productos} artículos</p>
            </div>
          </div>
        </div>
        
        <div className="mt-8 border-t border-gray-200 pt-6">
          <p className="text-gray-600 mb-4">
            Te hemos enviado un correo electrónico con los detalles de tu pedido y el seguimiento del envío.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/mi-cuenta/pedidos">
              <Button>Ver mis pedidos</Button>
            </Link>
            <Link href="/productos">
              <Button variant="outline">Volver a la tienda</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
