"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  ShoppingBagIcon,
} from "@heroicons/react/24/outline";

type Pedido = {
  id: string;
  fecha: string;
  total: number;
  estado: string;
  productos: number;
};

const STATUS_MAP: Record<string, string> = {
  pending: "Pendiente",
  processing: "En proceso",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const mapStatus = (s: string) => STATUS_MAP[s] || s;

const FILTROS = ["Todos", "Pendiente", "En proceso", "Enviado", "Entregado", "Cancelado"];

const getEstadoStyle = (estado: string) => {
  switch (estado) {
    case "Entregado":
      return "bg-emerald-100 text-emerald-800";
    case "En proceso":
      return "bg-amber-100 text-amber-800";
    case "Enviado":
      return "bg-blue-100 text-blue-800";
    case "Cancelado":
      return "bg-red-100 text-red-800";
    case "Pendiente":
      return "bg-purple-100 text-purple-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
};

export default function PedidosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta/pedidos");
    } else if (status === "authenticated") {
      setLoadError(null);
      fetch("/api/orders")
        .then((r) => {
          if (!r.ok) throw new Error("No se pudieron cargar tus pedidos");
          return r.json();
        })
        .then((data) => {
          if (Array.isArray(data)) {
            setPedidos(
              data.map((o: Record<string, unknown>) => ({
                id: o.id as string,
                fecha: ((o.created_at || o.date || "") as string).toString().split("T")[0],
                total: Number(o.total) || 0,
                estado: mapStatus((o.status as string) || "pending"),
                productos: (o.items_count as number) || 0,
              }))
            );
          }
        })
        .catch((err) => {
          console.error(err);
          setLoadError("No pudimos cargar tus pedidos. Revisa tu conexión e intenta de nuevo.");
        })
        .finally(() => setIsLoading(false));
    }
  }, [status, router, session]);

  const filteredPedidos = pedidos.filter((p) => {
    const matchEstado = filtroEstado === "Todos" || p.estado === filtroEstado;
    const q = busqueda.toLowerCase();
    const matchBusqueda = !q || p.id.toLowerCase().includes(q) || p.fecha.includes(busqueda);
    return matchEstado && matchBusqueda;
  });

  const totalPaginas = Math.ceil(filteredPedidos.length / itemsPorPagina);
  const pedidosPaginados = filteredPedidos.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <Link
        href="/mi-cuenta"
        className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-emerald-600 mb-8 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4 mr-2" />
        Volver a Mi Cuenta
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Mis Pedidos</h1>
        <p className="text-gray-500 font-medium">Revisa el estado y el historial de todas tus compras.</p>
      </div>

      {loadError && (
        <div role="alert" className="mb-6 bg-red-50 border border-red-100 text-red-700 px-5 py-4 rounded-2xl text-sm font-bold flex items-center justify-between gap-4">
          <span>{loadError}</span>
          <button
            onClick={() => window.location.reload()}
            className="shrink-0 px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-wide hover:bg-red-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 p-6 mb-6">
        {/* Barra de búsqueda */}
        <div className="relative mb-5">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número de pedido o fecha…"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
        </div>

        {/* Filtro por estado: pills */}
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => { setFiltroEstado(f); setPaginaActual(1); }}
              className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 ${
                filtroEstado === f
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      {filteredPedidos.length > 0 ? (
        <>
          {/* Tabla desktop */}
          <div className="hidden md:block bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden mb-6">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Pedido</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Fecha</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Total</th>
                  <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.15em]">Estado</th>
                  <th className="px-8 py-5 text-right text-[10px] font-black text-emerald-600 uppercase tracking-[0.15em]">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedidosPaginados.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        #{pedido.id.substring(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-gray-500">{pedido.fecha}</td>
                    <td className="px-8 py-5 text-sm font-black text-gray-900">${pedido.total.toLocaleString("es-CL")}</td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${getEstadoStyle(pedido.estado)}`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Link
                        href={`/mi-cuenta/pedidos/${pedido.id}`}
                        className="text-xs font-black text-emerald-600 hover:text-emerald-700 uppercase tracking-wider"
                      >
                        Ver detalles →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards móvil */}
          <div className="grid grid-cols-1 gap-3 md:hidden mb-6">
            {pedidosPaginados.map((pedido) => (
              <Link
                key={pedido.id}
                href={`/mi-cuenta/pedidos/${pedido.id}`}
                className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 active:scale-[0.98] transition-all"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      Pedido #{pedido.id.substring(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xl font-black text-gray-900">${pedido.total.toLocaleString("es-CL")}</p>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${getEstadoStyle(pedido.estado)}`}>
                    {pedido.estado}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-400 font-medium">
                  <span>{pedido.fecha} · {pedido.productos} {pedido.productos === 1 ? "producto" : "productos"}</span>
                  <span className="text-emerald-600 font-black">VER →</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex justify-center items-center gap-3">
              <button
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="p-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm disabled:opacity-30 hover:border-emerald-200 transition-all"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="px-5 py-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm font-black text-gray-700">
                {paginaActual} / {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="p-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm disabled:opacity-30 hover:border-emerald-200 transition-all"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-200/50 border border-gray-100 py-20 px-6 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <ShoppingBagIcon className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">
            {busqueda || filtroEstado !== "Todos" ? "Sin resultados" : "Aún no hay pedidos"}
          </h3>
          <p className="text-gray-400 font-medium mb-8 max-w-xs mx-auto">
            {busqueda || filtroEstado !== "Todos"
              ? "Ningún pedido coincide con los filtros aplicados."
              : "Cuando realices una compra, aparecerá aquí."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {(busqueda || filtroEstado !== "Todos") && (
              <button
                onClick={() => { setBusqueda(""); setFiltroEstado("Todos"); }}
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm uppercase tracking-wider hover:bg-gray-200 active:scale-95 transition-all"
              >
                Limpiar filtros
              </button>
            )}
            <Link
              href="/productos"
              className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 active:scale-95 transition-all"
            >
              Ir a la tienda
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
