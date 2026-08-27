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
  /** Permite ofrecer "Pagar ahora" en pedidos que quedaron sin acreditar. */
  pagable: boolean;
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
      return "bg-brand-100 text-brand-800";
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
  const [payingId, setPayingId] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
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
                pagable:
                  o.payment_method === "mercadopago" &&
                  o.payment_status !== "paid" &&
                  !["cancelled", "refunded"].includes(String(o.status || "")),
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

  /** Regenera el link de MercadoPago del pedido sin crear uno nuevo. */
  const handlePagar = async (id: string) => {
    setPayingId(id);
    setPayError(null);
    try {
      const res = await fetch(`/api/orders/${id}/retry-payment`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.initPoint) throw new Error(data.error || "No se pudo generar el link de pago.");
      window.location.href = data.initPoint;
    } catch (err: any) {
      setPayError(err.message);
      setPayingId(null);
    }
  };

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-10 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="o-container o-section max-w-5xl">
      <Link
        href="/mi-cuenta"
        className="o-focus group mb-6 inline-flex items-center gap-1.5 rounded-lg text-sm font-medium text-neutral-500 transition-colors hover:text-brand-700"
      >
        <ArrowLeftIcon className="size-4 transition-transform group-hover:-translate-x-0.5" />
        Volver a mi cuenta
      </Link>

      <div className="mb-8">
        <h1 className="o-h1 mb-1 text-neutral-900">Mis pedidos</h1>
        <p className="o-body text-neutral-500">Revisa el estado y el historial de tus compras.</p>
      </div>

      {loadError && (
        <div role="alert" className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{loadError}</span>
          <button
            onClick={() => window.location.reload()}
            className="o-focus shrink-0 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-red-700"
          >
            Reintentar
          </button>
        </div>
      )}

      {payError && (
        <div role="alert" className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {payError}
        </div>
      )}

      {/* Filtros */}
      <div className="o-card mb-6 p-5">
        {/* Barra de búsqueda */}
        <div className="relative mb-5">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por número de pedido o fecha…"
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
            className="h-11 w-full rounded-xl border border-neutral-200 pl-11 pr-4 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-brand-500"
          />
        </div>

        {/* Filtro por estado: pills */}
        <div className="flex flex-wrap gap-2">
          {FILTROS.map((f) => (
            <button
              key={f}
              onClick={() => { setFiltroEstado(f); setPaginaActual(1); }}
              className={`o-focus rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                filtroEstado === f
                  ? "bg-brand-600 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
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
          <div className="o-card mb-6 hidden overflow-hidden md:block">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-neutral-500">Pedido</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-neutral-500">Fecha</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-neutral-500">Total</th>
                  <th className="px-6 py-3.5 text-left text-xs font-medium text-neutral-500">Estado</th>
                  <th className="px-6 py-3.5 text-right text-xs font-medium text-neutral-500">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pedidosPaginados.map((pedido) => (
                  <tr key={pedido.id} className="hover:bg-brand-50/30 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-700">
                        #{pedido.id.substring(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm font-medium text-gray-500">{pedido.fecha}</td>
                    <td className="tabular px-6 py-4 text-sm font-semibold text-neutral-900">${pedido.total.toLocaleString("es-CL")}</td>
                    <td className="px-8 py-5">
                      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${getEstadoStyle(pedido.estado)}`}>
                        {pedido.estado}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center justify-end gap-3">
                        {pedido.pagable && (
                          <button
                            onClick={() => handlePagar(pedido.id)}
                            disabled={payingId === pedido.id}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
                          >
                            {payingId === pedido.id ? "Generando…" : "Pagar ahora"}
                          </button>
                        )}
                        <Link
                          href={`/mi-cuenta/pedidos/${pedido.id}`}
                          className="text-xs font-semibold text-neutral-500 hover:text-brand-700"
                        >
                          Ver detalles
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards móvil */}
          <div className="grid grid-cols-1 gap-3 md:hidden mb-6">
            {pedidosPaginados.map((pedido) => (
              <div
                key={pedido.id}
                className="rounded-2xl border border-neutral-200 bg-white p-5"
              >
                <Link href={`/mi-cuenta/pedidos/${pedido.id}`} className="block">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="mb-1 text-xs font-medium text-neutral-400">
                        Pedido #{pedido.id.substring(0, 8).toUpperCase()}
                      </p>
                      <p className="text-xl font-bold text-neutral-900">
                        ${pedido.total.toLocaleString("es-CL")}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getEstadoStyle(pedido.estado)}`}>
                      {pedido.estado}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {pedido.fecha} · {pedido.productos} {pedido.productos === 1 ? "producto" : "productos"}
                  </p>
                </Link>
                <div className="mt-4 flex items-center gap-2">
                  {pedido.pagable && (
                    <button
                      onClick={() => handlePagar(pedido.id)}
                      disabled={payingId === pedido.id}
                      className="h-10 flex-1 rounded-xl bg-brand-600 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
                    >
                      {payingId === pedido.id ? "Generando…" : "Pagar ahora"}
                    </button>
                  )}
                  <Link
                    href={`/mi-cuenta/pedidos/${pedido.id}`}
                    className="flex h-10 flex-1 items-center justify-center rounded-xl border border-neutral-200 text-sm font-semibold text-neutral-700"
                  >
                    Ver detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex justify-center items-center gap-3">
              <button
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaActual === 1}
                className="p-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm disabled:opacity-30 hover:border-brand-200 transition-all"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <span className="tabular rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700">
                {paginaActual} / {totalPaginas}
              </span>
              <button
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaActual === totalPaginas}
                className="p-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm disabled:opacity-30 hover:border-brand-200 transition-all"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="o-card px-6 py-16 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100">
            <ShoppingBagIcon className="w-10 h-10 text-gray-200" />
          </div>
          <h3 className="o-h2 mb-2 text-neutral-900">
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
                className="o-focus h-11 rounded-xl border border-neutral-200 px-5 text-sm font-semibold text-neutral-700 transition-colors hover:border-neutral-300"
              >
                Limpiar filtros
              </button>
            )}
            <Link
              href="/productos"
              className="o-focus inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Ir a la tienda
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
