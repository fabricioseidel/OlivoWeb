"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

// Tipo para los pedidos
type Pedido = {
  id: string;
  fecha: string; // YYYY-MM-DD
  total: number;
  estado: string;
  productos: number;
  email?: string;
  customer?: string;
  userId?: string;
};

export default function PedidosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [filteredPedidos, setFilteredPedidos] = useState<Pedido[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 10;

  // Estados para filtros
  const [filtroEstado, setFiltroEstado] = useState("todos");

  // Redirigir si no está autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/mi-cuenta/pedidos");
    } else if (status === "authenticated") {
      const fetchOrders = async () => {
        try {
          const res = await fetch('/api/orders');
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              const normalized: Pedido[] = data.map((o: any) => ({
                id: o.id,
                fecha: (o.created_at || o.date || '').toString().split('T')[0],
                total: Number(o.total) || 0,
                estado: o.status || 'Pendiente',
                productos: o.items_count || 0,
                email: o.shipping_address?.email,
                customer: o.shipping_address?.fullName,
                userId: o.user_id
              }));
              setPedidos(normalized);
              setFilteredPedidos(normalized);
            }
          }
        } catch (error) {
          console.error("Error fetching orders", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrders();
    } else {
      // Modo demo: mostrar pedidos de ejemplo
      const exampleOrders = [
        {
          id: "ORD-2025-001",
          fecha: "2025-08-10",
          total: 129.99,
          estado: "Entregado",
          productos: 2
        },
        {
          id: "ORD-2025-002",
          fecha: "2025-08-08",
          total: 89.50,
          estado: "En tránsito",
          productos: 1
        },
        {
          id: "ORD-2025-003",
          fecha: "2025-08-05",
          total: 199.99,
          estado: "Procesando",
          productos: 3
        },
        {
          id: "ORD-2025-004",
          fecha: "2025-08-01",
          total: 45.00,
          estado: "Entregado",
          productos: 1
        }
      ];
      setPedidos(exampleOrders);
      setFilteredPedidos(exampleOrders);
      setIsLoading(false);
    }
  }, [status, router, session]);

  // Aplicar filtros y búsqueda
  useEffect(() => {
    let resultado = [...pedidos];

    // Filtrar por estado
    if (filtroEstado !== "todos") {
      resultado = resultado.filter(pedido => pedido.estado === filtroEstado);
    }

    // Aplicar búsqueda
    if (busqueda) {
      const busquedaLower = busqueda.toLowerCase();
      resultado = resultado.filter(
        pedido =>
          pedido.id.toLowerCase().includes(busquedaLower) ||
          pedido.fecha.includes(busqueda)
      );
    }

    setFilteredPedidos(resultado);
    setPaginaActual(1); // Resetear a primera página al cambiar filtros
  }, [busqueda, filtroEstado, pedidos]);

  // Obtener el color de badge según estado
  const getEstadoColor = (estado: string): string => {
    switch (estado) {
      case "Entregado":
        return "bg-green-100 text-green-800";
      case "En proceso":
        return "bg-yellow-100 text-yellow-800";
      case "Enviado":
        return "bg-blue-100 text-blue-800";
      case "Cancelado":
        return "bg-red-100 text-red-800";
      case "Pendiente":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Paginación
  const totalPaginas = Math.ceil(filteredPedidos.length / itemsPorPagina);
  const pedidosPaginados = filteredPedidos.slice(
    (paginaActual - 1) * itemsPorPagina,
    paginaActual * itemsPorPagina
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/mi-cuenta" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Volver a Mi cuenta
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-6">Mis Pedidos</h1>

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
            <div>
              <label htmlFor="filtroEstado" className="block text-sm font-medium text-gray-700 mb-1">
                Estado
              </label>
              <select
                id="filtroEstado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="todos">Todos</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En proceso">En proceso</option>
                <option value="Enviado">Enviado</option>
                <option value="Entregado">Entregado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por número o fecha..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Lista de pedidos */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          </div>
        ) : filteredPedidos.length > 0 ? (
          <>
            {/* Vista Tabla (Escritorio) */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Pedido</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Fecha</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Total</th>
                    <th className="px-6 py-4 text-left text-xs font-black text-gray-500 uppercase tracking-[0.1em]">Estado</th>
                    <th className="relative px-6 py-4 whitespace-nowrap text-right text-xs font-black text-emerald-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {pedidosPaginados.map((pedido) => (
                    <tr key={pedido.id} className="hover:bg-emerald-50/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap tracking-tight font-bold text-gray-900">
                        #{pedido.id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{pedido.fecha}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900">${pedido.total.toLocaleString('es-CL')}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${getEstadoColor(pedido.estado)}`}>
                          {pedido.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link href={`/mi-cuenta/pedidos/${pedido.id}`} className="text-emerald-600 font-bold hover:text-emerald-700">
                          Detalles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Cards (Móvil) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {pedidosPaginados.map((pedido) => (
                <Link key={pedido.id} href={`/mi-cuenta/pedidos/${pedido.id}`} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-gray-100 active:scale-[0.98] transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pedido #{pedido.id.substring(0, 8)}</p>
                      <p className="text-lg font-black text-gray-900">${pedido.total.toLocaleString('es-CL')}</p>
                    </div>
                    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full ${getEstadoColor(pedido.estado)}`}>
                      {pedido.estado}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span className="font-medium">{pedido.fecha}</span>
                    <span className="flex items-center gap-1 text-emerald-600 font-bold">VER DETALLES <ChevronRightIcon className="w-3 h-3" /></span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="mt-8 flex justify-center gap-2">
                <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} className="p-2 bg-white rounded-xl border border-gray-100 disabled:opacity-30"><ChevronLeftIcon className="w-5 h-5" /></button>
                <div className="flex items-center px-4 font-bold text-sm">Página {paginaActual} de {totalPaginas}</div>
                <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} className="p-2 bg-white rounded-xl border border-gray-100 disabled:opacity-30"><ChevronRightIcon className="w-5 h-5" /></button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed border-gray-200">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <MagnifyingGlassIcon className="h-10 w-10 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Pedidos no visibles en este momento</h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto mb-8">
              {busqueda || filtroEstado !== "todos"
                ? "Ningún pedido coincide con tus filtros."
                : "Si realizaste una compra recientemente y no aparece, intenta recargar la página."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                Recargar Página
              </button>
              <Link
                href="/productos"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all"
              >
                Ir a la tienda
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
