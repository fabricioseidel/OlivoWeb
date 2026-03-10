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
import Button from "@/components/ui/Button";
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
          date: o.date || o.fecha || (o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : ''),
          total: typeof o.total === 'number' ? o.total : Number(o.total) || 0,
          status: o.status || o.estado || 'Desconocido',
          items: Array.isArray(o.items) ? o.items.length : (o.productos || o.items || 0)
        }));
        parsed.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setRecentOrders(parsed.slice(0, 3));
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Mi Cuenta</h1>
        <p className="text-gray-500 font-medium">Gestiona tu perfil, pedidos y direcciones</p>
      </div>

      {/* Tarjeta de bienvenida y resumen - Premium */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8 mb-10 group hover:shadow-xl transition-all duration-500 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none group-hover:bg-emerald-100 transition-colors" />

        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          <div className="h-24 w-24 rounded-3xl bg-emerald-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-xl">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt={session.user.name || "Usuario"}
                width={96}
                height={96}
                className="h-full w-full object-cover"
              />
            ) : (
              <UserIcon className="h-10 w-10 text-emerald-600" />
            )}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              ¡Hola, {displayName}!
            </h2>
            <p className="text-lg text-gray-500 font-medium">{session?.user?.email}</p>
          </div>
          <div className="sm:ml-auto">
            <Link href="/mi-cuenta/informacion-personal">
              <Button variant="outline" className="rounded-2xl border-2 font-bold hover:bg-emerald-50 hover:border-emerald-200">
                Editar Perfil
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Secciones de la cuenta - Navegación estilo App */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Configuración</h2>
            </div>
            <div className="p-4 space-y-2">
              {[
                { label: "Información personal", href: "/mi-cuenta/informacion-personal", icon: UserIcon },
                { label: "Mis pedidos", href: "/mi-cuenta/pedidos", icon: ShoppingBagIcon },
                { label: "Mis direcciones", href: "/mi-cuenta/direcciones", icon: MapPinIcon },
                { label: "Cambiar contraseña", href: "/mi-cuenta/cambiar-contrasena", icon: KeyIcon },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center p-4 hover:bg-emerald-50 rounded-2xl transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-white group-hover:text-emerald-600 group-hover:shadow-md transition-all">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="ml-4 font-bold text-gray-700 group-hover:text-emerald-800">{item.label}</span>
                  <ChevronRightIcon className="h-5 w-5 text-gray-300 ml-auto group-hover:text-emerald-400 transition-all font-bold" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Pedidos recientes - Mobile First Cards */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="px-8 py-6 bg-gray-50/50 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Pedidos recientes</h2>
              <Link href="/mi-cuenta/pedidos" className="text-sm font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1 group">
                Ver todo el historial
                <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>

            <div className="p-6 flex-1">
              {recentOrders.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    {recentOrders.map((order) => (
                      <Link
                        key={order.id}
                        href={`/mi-cuenta/pedidos/${order.id}`}
                        className="group flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-3xl border border-gray-100 hover:border-emerald-200 hover:shadow-lg transition-all duration-300 gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">
                            #{order.id.slice(-4).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 leading-none mb-1">Pedido {order.id.slice(0, 8)}</p>
                            <p className="text-xs text-gray-500 font-bold">{order.date}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6">
                          <div className="text-left sm:text-right">
                            <p className="font-black text-emerald-600 tracking-tight">$ {order.total.toLocaleString('es-CL')}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{order.items} {order.items === 1 ? 'producto' : 'productos'}</p>
                          </div>
                          <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full shadow-sm ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 px-4 flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-gray-50 flex items-center justify-center mb-6">
                    <ShoppingBagIcon className="h-10 w-10 text-gray-300" />
                  </div>
                  <h3 className="text-xl font-black text-gray-900 mb-2">Aún no hay pedidos</h3>
                  <p className="text-gray-500 font-medium max-w-xs mb-8">
                    Parece que todavía no has realizado ninguna compra en nuestra tienda.
                  </p>
                  <Link href="/productos">
                    <Button className="rounded-2xl px-8 h-12 font-black shadow-lg shadow-emerald-500/20">
                      Explorar Productos
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
