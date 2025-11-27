"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserIcon,
  ShoppingBagIcon,
  MapPinIcon,
  KeyIcon,
  ArrowRightIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useLocalStorage } from "@/hooks/useLocalStorage";

// Definir tipo para las órdenes
type Order = {
  id: string;
  date: string;
  total: number;
  status: string;
  items: number;
};

export default function MiCuentaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  
  // Usar el hook personalizado para cargar datos con respaldo
  const [savedOrders] = useLocalStorage<Order[]>('orders', []);
  const [savedProfile] = useLocalStorage<any>('profile', {} as any);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta");
    } else if (status === "authenticated") {
      // Cargar displayName (solo perfil guardado o nombre de sesión, no datos ficticios)
      if (savedProfile?.nombre && savedProfile?.apellidos) {
        setDisplayName(`${savedProfile.nombre} ${savedProfile.apellidos}`);
      } else if (session?.user?.name) {
        setDisplayName(session.user.name);
      } else {
        setDisplayName("Usuario");
      }

      // Filtrar pedidos reales del usuario (por email o userId si existiera)
      try {
        const email = session?.user?.email;
        const userOrders = Array.isArray(savedOrders)
          ? savedOrders.filter((o: any) => (o.email && email && o.email === email) || (o.userId && session?.user && (o.userId === (session.user as any).id)))
          : [];
        // Normalizar y ordenar por fecha/createdAt descendente
        const parsed = userOrders.map((o: any) => ({
          id: o.id,
            date: o.date || o.fecha || (o.createdAt ? new Date(o.createdAt).toISOString().slice(0,10) : ''),
          total: typeof o.total === 'number' ? o.total : Number(o.total) || 0,
          status: o.status || o.estado || 'Desconocido',
          items: Array.isArray(o.items) ? o.items.length : (o.productos || o.items || 0)
        }));
        parsed.sort((a,b) => (b.date || '').localeCompare(a.date || ''));
        setRecentOrders(parsed.slice(0,3));
      } catch {
        setRecentOrders([]);
      }
      setIsLoading(false);
    }
  }, [status, router, session, savedProfile, savedOrders]);

  // Obtener el color de badge según estado
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Completado":
        return "bg-green-100 text-green-800";
      case "En proceso":
        return "bg-yellow-100 text-yellow-800";
      case "Enviado":
        return "bg-blue-100 text-blue-800";
      case "Cancelado":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Mi Cuenta</h1>

      {/* Tarjeta de bienvenida y resumen */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center">
          <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "Usuario"}
                width={64}
                height={64}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserIcon className="h-8 w-8 text-gray-500" />
            )}
          </div>
          <div className="ml-4">
            <h2 className="text-xl font-semibold text-gray-900">
              ¡Hola, {displayName}!
            </h2>
            <p className="text-gray-600">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Secciones de la cuenta */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Mi Cuenta</h2>
          </div>
          <div className="p-4">
            <ul className="divide-y divide-gray-200">
              <li>
                <Link 
                  href="/mi-cuenta/informacion-personal" 
                  className="flex items-center py-3 px-2 hover:bg-gray-50 rounded-md transition duration-150"
                >
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-700">Información personal</span>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto" />
                </Link>
              </li>
              <li>
                <Link 
                  href="/mi-cuenta/pedidos" 
                  className="flex items-center py-3 px-2 hover:bg-gray-50 rounded-md transition duration-150"
                >
                  <ShoppingBagIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-700">Mis pedidos</span>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto" />
                </Link>
              </li>
              <li>
                <Link 
                  href="/mi-cuenta/direcciones" 
                  className="flex items-center py-3 px-2 hover:bg-gray-50 rounded-md transition duration-150"
                >
                  <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-700">Mis direcciones</span>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto" />
                </Link>
              </li>
              <li>
                <Link 
                  href="/mi-cuenta/cambiar-contrasena" 
                  className="flex items-center py-3 px-2 hover:bg-gray-50 rounded-md transition duration-150"
                >
                  <KeyIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-700">Cambiar contraseña</span>
                  <ChevronRightIcon className="h-5 w-5 text-gray-400 ml-auto" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Pedidos recientes */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden md:col-span-2">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">Pedidos recientes</h2>
            <Link href="/mi-cuenta/pedidos" className="text-sm text-blue-600 hover:text-blue-800 flex items-center">
              Ver todos
              <ArrowRightIcon className="h-4 w-4 ml-1" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            {recentOrders.length > 0 ? (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pedido
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Ver</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">{order.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{order.date}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${order.total.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{Array.isArray(order.items) ? order.items.length : order.items} {Array.isArray(order.items) ? (order.items.length === 1 ? 'producto' : 'productos') : (order.items === 1 ? 'producto' : 'productos')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/mi-cuenta/pedidos/${order.id}`} className="text-blue-600 hover:text-blue-900">
                          Ver detalles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8">
                <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No tienes pedidos</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Empieza a explorar productos y realiza tu primer pedido.
                </p>
                <div className="mt-6">
                  <Link
                    href="/productos"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Ver productos
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
