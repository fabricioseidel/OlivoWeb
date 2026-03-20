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
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [savedProfile] = useLocalStorage<any>('profile', {} as any);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta");
    } else if (status === "authenticated") {
      // Cargar displayName
      if (savedProfile?.nombre && savedProfile?.apellidos) {
        setDisplayName(`${savedProfile.nombre} ${savedProfile.apellidos}`);
      } else if (session?.user?.name) {
        setDisplayName(session.user.name);
      } else {
        setDisplayName("Usuario");
      }

      // FETCH REAL ORDERS FROM API
      const fetchOrders = async () => {
        try {
          const res = await fetch('/api/orders');
          if (res.ok) {
            const data = await res.json();
            const formatted = data.map((o: any) => ({
              id: o.id,
              date: new Date(o.created_at).toLocaleDateString(),
              total: o.total,
              status: mapStatus(o.status),
              items: o.items_count || 0
            }));
            setRecentOrders(formatted.slice(0, 3));
          }
        } catch (error) {
          console.error("Error fetching orders:", error);
        } finally {
          setIsLoading(false);
        }
      };

      fetchOrders();
    }
  }, [status, router, session, savedProfile]);

  const mapStatus = (s: string) => {
    const statuses: Record<string, string> = {
      'pending': 'Pendiente',
      'processing': 'En proceso',
      'shipped': 'Enviado',
      'delivered': 'Entregado',
      'cancelled': 'Cancelado'
    };
    return statuses[s] || s;
  };

  // Obtener el color de badge según estado
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Entregado":
      case "Completado":
        return "bg-green-100 text-green-800";
      case "En proceso":
      case "Pendiente":
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Mi Cuenta</h1>
          <p className="text-gray-500 font-medium">Hola, <span className="text-emerald-600 font-bold">{displayName}</span>. Gestiona tus pedidos y perfil aquí.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/mi-cuenta/perfil">
            <Button variant="outline" className="rounded-2xl border-2 font-bold hover:bg-emerald-50 hover:border-emerald-200 transition-all">
              Editar Perfil
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel Izquierdo: Resumen y accesos rápidos */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-gray-200/50 border border-gray-100 text-center relative overflow-hidden group">
            {/* Fondo decorativo de tarjeta premium */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-emerald-500/10 transition-colors" />
            
            <div className="relative z-10">
              <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg overflow-hidden">
                {session?.user?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={session.user.image} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <UserIcon className="w-12 h-12 text-emerald-600" />
                )}
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">{displayName}</h2>
              <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-6">Miembro OlivoMarket</p>
              
              {/* Tarjeta de Lealtad Premium */}
              <div className="bg-gradient-to-br from-emerald-600 to-emerald-900 rounded-3xl p-6 text-white text-left shadow-2xl shadow-emerald-900/40 relative overflow-hidden mb-8">
                 <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-2xl -mr-5 -mt-5" />
                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Mis Puntos Acumulados</p>
                 <div className="flex items-end justify-between">
                    <p className="text-4xl font-black">1.250 <span className="text-xs opacity-60 font-medium tracking-normal">pts</span></p>
                    <div className="bg-white/20 px-3 py-1 rounded-full backdrop-blur-md">
                       <p className="text-[10px] font-black uppercase tracking-wider">Socio Oro</p>
                    </div>
                 </div>
                 <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                    <p className="text-[8px] font-bold opacity-60 uppercase tracking-widest">Vencen en: 12/2026</p>
                    <Link href="/mi-cuenta/puntos" className="text-[10px] font-black uppercase tracking-tighter hover:text-emerald-300 transition-colors">Ver Beneficios →</Link>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-2xl font-black text-emerald-600">{recentOrders.length}</p>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-none mt-1">Pedidos</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-2xl font-black text-emerald-600">2</p>
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest leading-none mt-1">Cupones</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] overflow-hidden shadow-xl shadow-gray-200/50 border border-gray-100">
            <div className="p-2">
              <Link href="/mi-cuenta/pedidos" className="flex items-center gap-4 p-4 hover:bg-emerald-50 rounded-2xl transition-all group">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                  <ShoppingBagIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 group-hover:text-emerald-700">Mis Pedidos</p>
                  <p className="text-xs text-gray-400">Ver historial de compras</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-emerald-500" />
              </Link>

              <Link href="/mi-cuenta/direcciones" className="flex items-center gap-4 p-4 hover:bg-emerald-50 rounded-2xl transition-all group">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <MapPinIcon className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 group-hover:text-emerald-700">Direcciones</p>
                  <p className="text-xs text-gray-400">Gestionar domicilios</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-emerald-500" />
              </Link>

              <Link href="/mi-cuenta/seguridad" className="flex items-center gap-4 p-4 hover:bg-emerald-50 rounded-2xl transition-all group">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                  <KeyIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 group-hover:text-emerald-700">Privacidad</p>
                  <p className="text-xs text-gray-400">Cambiar contraseña</p>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-gray-300 group-hover:text-emerald-500" />
              </Link>
            </div>
          </div>
        </div>

        {/* Panel Derecho: Pedidos recientes */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-emerald-50/30">
              <div className="flex items-center gap-3">
                <ShoppingBagIcon className="w-6 h-6 text-emerald-600" />
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Pedidos Recientes</h3>
              </div>
              <Link href="/mi-cuenta/pedidos" className="text-emerald-600 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                Ver todo el historial <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex-1 p-4 sm:p-8">
              {recentOrders.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentOrders.map((order) => (
                    <Link key={order.id} href={`/mi-cuenta/pedidos/${order.id}`} className="group p-5 rounded-3xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all flex flex-col shadow-sm hover:shadow-md">
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-100 px-2 py-1 rounded-lg">#{order.id.slice(0, 8).toUpperCase()}</span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <div className="mb-4">
                        <p className="text-2xl font-black text-gray-900">${order.total.toLocaleString()}</p>
                        <p className="text-xs font-medium text-gray-400">{order.date}</p>
                      </div>
                      <div className="mt-auto flex items-center justify-between text-sx font-bold text-gray-500 group-hover:text-emerald-700">
                        <span>{order.items} {order.items === 1 ? 'Producto' : 'Productos'}</span>
                        <ChevronRightIcon className="w-4 h-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20 px-6">
                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                    <ShoppingBagIcon className="w-10 h-10 text-gray-200" />
                  </div>
                  <h4 className="text-2xl font-black text-gray-900 mb-2">Aún no hay pedidos</h4>
                  <p className="text-gray-400 font-medium mb-10 max-w-[280px]">Parece que todavía no has realizado ninguna compra en nuestra tienda.</p>
                  <Link href="/productos">
                    <Button className="h-14 px-10 rounded-2xl font-black text-lg bg-emerald-600 shadow-lg shadow-emerald-500/20">
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
