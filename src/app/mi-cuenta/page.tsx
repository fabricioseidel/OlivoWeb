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
  ChevronRightIcon,
  CubeIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useLocalStorage } from "@/hooks/useLocalStorage";

type Order = {
  id: string;
  date: string;
  total: number;
  status: string;
  items: number;
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  processing: "En proceso",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const mapStatus = (s: string) => STATUS_LABELS[s] || s;

const STATUS_STYLES: Record<string, string> = {
  Entregado: "bg-brand-100 text-brand-800",
  Completado: "bg-brand-100 text-brand-800",
  "En proceso": "bg-amber-100 text-amber-800",
  Pendiente: "bg-amber-100 text-amber-800",
  Enviado: "bg-blue-100 text-blue-800",
  Cancelado: "bg-red-100 text-red-800",
};

const getStatusColor = (status: string) => STATUS_STYLES[status] || "bg-neutral-100 text-neutral-700";

const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

const SHORTCUTS = [
  {
    href: "/mi-cuenta/pedidos",
    icon: ShoppingBagIcon,
    title: "Mis pedidos",
    detail: "Historial de compras",
  },
  {
    href: "/mi-cuenta/direcciones",
    icon: MapPinIcon,
    title: "Direcciones",
    detail: "Gestionar domicilios",
  },
  {
    href: "/mi-cuenta/cambiar-contrasena",
    icon: KeyIcon,
    title: "Seguridad",
    detail: "Cambiar contraseña",
  },
  {
    href: "/punto-de-envio",
    icon: CubeIcon,
    title: "Encomiendas",
    detail: "Envíos y retiros",
  },
];

export default function MiCuentaPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loyalty, setLoyalty] = useState<any>(null);
  const [savedProfile] = useLocalStorage<any>('profile', {} as any);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta");
    }
  }, [status, router]);

  // Los pedidos y los puntos dependen solo de la sesión. Antes este efecto
  // también dependía de `savedProfile`, que cambia de identidad cuando se lee
  // localStorage, y eso disparaba una segunda ronda de fetch a /api/orders y
  // /api/loyalty en cada carga.
  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    const fetchOrders = async () => {
      try {
        const res = await fetch('/api/orders');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const formatted: Order[] = data.map((o: any) => ({
          id: o.id,
          date: new Date(o.created_at).toLocaleDateString('es-CL'),
          total: o.total,
          status: mapStatus(o.status),
          items: o.items_count || 0,
        }));
        setTotalOrders(formatted.length);
        setRecentOrders(formatted.slice(0, 3));
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    const fetchLoyalty = async () => {
      if (!session?.user?.email) return;
      try {
        const res = await fetch(`/api/loyalty?email=${session.user.email}`);
        if (res.ok && !cancelled) setLoyalty(await res.json());
      } catch (error) {
        console.error("Error fetching loyalty:", error);
      }
    };

    Promise.all([fetchOrders(), fetchLoyalty()]).finally(() => {
      if (!cancelled) setIsLoading(false);
    });

    return () => { cancelled = true; };
  }, [status, session?.user?.email]);

  const displayName =
    (savedProfile?.nombre && savedProfile?.apellidos
      ? `${savedProfile.nombre} ${savedProfile.apellidos}`
      : session?.user?.name) || "Usuario";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="o-container o-section">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="o-h1 text-neutral-900">Mi cuenta</h1>
          <p className="o-body mt-1 text-neutral-500">
            Hola, {displayName}. Gestiona tus pedidos y tu perfil.
          </p>
        </div>
        <Link href="/mi-cuenta/informacion-personal">
          <Button variant="outline" className="h-11">Editar perfil</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* ── Perfil y accesos ── */}
        <div className="space-y-4 lg:col-span-1">
          <div className="o-card p-6 text-center">
            <div className="mx-auto mb-4 flex size-20 items-center justify-center overflow-hidden rounded-full bg-brand-50">
              {session?.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={session.user.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="size-9 text-brand-600" />
              )}
            </div>
            <h2 className="o-h3 text-neutral-900">{displayName}</h2>
            {session?.user?.email && (
              <p className="o-caption mt-0.5 text-neutral-500">{session.user.email}</p>
            )}

            {/* Puntos de fidelidad */}
            <div className="mt-5 rounded-xl border border-neutral-200 p-4 text-left">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-neutral-500">Puntos acumulados</p>
                  <p className="tabular mt-0.5 text-2xl font-bold text-neutral-900">
                    {loyalty?.points || 0}
                    <span className="ml-1 text-sm font-normal text-neutral-500">pts</span>
                  </p>
                </div>
                <span className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-800">
                  {loyalty?.tier?.name || 'Socio'}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                <p className="text-xs text-neutral-500">
                  {loyalty?.nextTier
                    ? `Faltan ${loyalty.pointsToNextTier} pts para ${loyalty.nextTier.name}`
                    : "Alcanzaste el nivel máximo"}
                </p>
                <Link
                  href="/mi-cuenta/puntos"
                  className="o-focus shrink-0 rounded text-xs font-medium text-brand-700 hover:text-brand-800"
                >
                  Ver beneficios
                </Link>
              </div>
            </div>

            <Link
              href="/mi-cuenta/pedidos"
              className="o-focus mt-4 block rounded-xl border border-neutral-200 p-4 transition-colors hover:border-brand-300"
            >
              <p className="tabular text-2xl font-bold text-neutral-900">{totalOrders}</p>
              <p className="mt-0.5 text-xs text-neutral-500">
                {totalOrders === 1 ? 'pedido realizado' : 'pedidos realizados'}
              </p>
            </Link>
          </div>

          <nav className="o-card overflow-hidden p-2">
            {SHORTCUTS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="o-focus group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-neutral-50"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-brand-50 group-hover:text-brand-700">
                  <item.icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-neutral-900">{item.title}</span>
                  <span className="block text-xs text-neutral-500">{item.detail}</span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-neutral-300 group-hover:text-brand-600" />
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Pedidos recientes ── */}
        <div className="lg:col-span-2">
          <div className="o-card flex h-full flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-6 py-4">
              <h2 className="o-h3 text-neutral-900">Pedidos recientes</h2>
              <Link
                href="/mi-cuenta/pedidos"
                className="o-focus group inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-brand-700 hover:text-brand-800"
              >
                Ver todos
                <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>

            <div className="flex-1 p-4 sm:p-6">
              {recentOrders.length > 0 ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {recentOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/mi-cuenta/pedidos/${order.id}`}
                      className="o-card o-card-interactive o-focus group flex flex-col p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-neutral-500">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </div>
                      <p className="tabular text-xl font-bold text-neutral-900">{clp(order.total)}</p>
                      <p className="o-caption text-neutral-500">{order.date}</p>
                      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 text-sm text-neutral-500 group-hover:text-brand-700">
                        <span>{order.items} {order.items === 1 ? 'producto' : 'productos'}</span>
                        <ChevronRightIcon className="size-4" />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-neutral-100">
                    <ShoppingBagIcon className="size-7 text-neutral-400" />
                  </div>
                  <h3 className="o-h3 mb-1 text-neutral-900">Aún no hay pedidos</h3>
                  <p className="o-body mb-6 max-w-xs text-neutral-500">
                    Cuando hagas tu primera compra, aparecerá aquí.
                  </p>
                  <Link href="/productos">
                    <Button className="h-12 px-7">Explorar productos</Button>
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
