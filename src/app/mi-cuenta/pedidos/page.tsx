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
      const userEmail = session?.user?.email;
      const raw = typeof window !== 'undefined' ? localStorage.getItem('orders') : null;
      let saved: Pedido[] = [];
      if (raw) {
        try {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            saved = arr.map((o: any): Pedido => ({
              id: o.id,
              fecha: (o.fecha || o.date || '').toString().split('T')[0] || '-',
              total: Number(o.total) || 0,
              estado: o.estado || o.status || 'En proceso',
              productos: o.productos || (Array.isArray(o.items) ? o.items.reduce((s: number, it: any) => s + (Number(it.quantity)||0), 0) : 0),
              email: o.email,
              customer: o.customer,
              userId: o.userId
            }));
          }
        } catch {}
      }
      // Filtrar solo pedidos del usuario (por email o userId)
      const own = saved.filter(p => !userEmail || p.email === userEmail);
      setPedidos(own);
      setFilteredPedidos(own);
      setIsLoading(false);
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
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {pedidosPaginados.length > 0 ? (
          <>
            <div className="overflow-x-auto">
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
                  {pedidosPaginados.map((pedido) => (
                    <tr key={pedido.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-blue-600">{pedido.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{pedido.fecha}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${pedido.total.toFixed(2)}</div>
                        <div className="text-sm text-gray-500">{pedido.productos} {pedido.productos === 1 ? 'producto' : 'productos'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoColor(pedido.estado)}`}>
                          {pedido.estado}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link href={`/mi-cuenta/pedidos/${pedido.id}`} className="text-blue-600 hover:text-blue-900">
                          Ver detalles
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Paginación */}
            {totalPaginas > 1 && (
              <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{(paginaActual - 1) * itemsPorPagina + 1}</span> a{" "}
                      <span className="font-medium">
                        {Math.min(paginaActual * itemsPorPagina, filteredPedidos.length)}
                      </span>{" "}
                      de <span className="font-medium">{filteredPedidos.length}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                        disabled={paginaActual === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          paginaActual === 1
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <span className="sr-only">Anterior</span>
                        <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                      
                      {/* Números de página */}
                      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(pagina => (
                        <button
                          key={pagina}
                          onClick={() => setPaginaActual(pagina)}
                          className={`relative inline-flex items-center px-4 py-2 border ${
                            pagina === paginaActual
                              ? "bg-blue-50 border-blue-500 text-blue-600 z-10"
                              : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                          } text-sm font-medium`}
                        >
                          {pagina}
                        </button>
                      ))}
                      
                      <button
                        onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPaginas))}
                        disabled={paginaActual === totalPaginas}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          paginaActual === totalPaginas
                            ? "text-gray-300 cursor-not-allowed"
                            : "text-gray-500 hover:bg-gray-50"
                        }`}
                      >
                        <span className="sr-only">Siguiente</span>
                        <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No se encontraron pedidos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {busqueda || filtroEstado !== "todos"
                ? "Intenta con otros filtros de búsqueda"
                : "Aún no has realizado ningún pedido"}
            </p>
            {!(busqueda || filtroEstado !== "todos") && (
              <div className="mt-6">
                <Link
                  href="/productos"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Ver productos
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
