"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

// Tipos
type ProductoEnPedido = {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  imagenUrl: string;
};

type DatosDireccion = {
  nombre: string;
  calle: string;
  numero: string;
  interior?: string;
  colonia: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  telefono: string;
};

type Pedido = {
  id: string;
  fecha: string;
  total: number;
  subtotal: number;
  envio: number;
  impuestos: number;
  estado: string;
  productos: ProductoEnPedido[];
  direccionEnvio: DatosDireccion;
  metodoPago: string;
  numeroSeguimiento?: string;
};

export default function DetallePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [error, setError] = useState("");

  // Redirigir si no está autenticado
  useEffect(() => {
    if (status === "unauthenticated") {
  router.push(`/login?callbackUrl=/mi-cuenta/pedidos/${id}`);
    } else if (status === "authenticated") {
      try {
        const raw = localStorage.getItem('orders');
        if (!raw) { setError('No se encontró el pedido'); setIsLoading(false); return; }
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) { setError('No se encontró el pedido'); setIsLoading(false); return; }
        const found = arr.find((o: any) => o.id === id);
        if (!found) { setError('No se encontró el pedido'); setIsLoading(false); return; }
        const items = Array.isArray(found.items) ? found.items : [];
        const productos: ProductoEnPedido[] = items.map((it: any, idx: number) => ({
          id: it.id?.toString() || `ITEM-${idx}`,
          nombre: it.name || it.nombre || `Producto ${idx+1}`,
          precio: Number(it.price) || 0,
          cantidad: Number(it.quantity) || 1,
          imagenUrl: it.image || '/file.svg'
        }));
        const subtotal = productos.reduce((s, p) => s + p.precio * p.cantidad, 0);
        const envio = 10; // consistente con checkout
        const impuestos = subtotal * 0.19;
        const direccion = found.shippingAddress || {};
        const direccionEnvio: DatosDireccion = {
          nombre: direccion.nombre || found.customer || '-',
          calle: direccion.calle || '-',
          numero: direccion.numero || '',
          interior: direccion.interior || '',
          colonia: direccion.colonia || '-',
          ciudad: direccion.ciudad || '-',
          estado: direccion.estado || '-',
          codigoPostal: direccion.codigoPostal || '-',
          telefono: direccion.telefono || '+00 000 0000'
        };
        const pedidoObj: Pedido = {
          id: found.id,
          fecha: (found.fecha || found.date || '').toString().split('T')[0] || '-',
          subtotal,
          envio,
          impuestos,
          total: subtotal + envio + impuestos,
          estado: found.estado || found.status || 'En proceso',
          productos,
          direccionEnvio,
          metodoPago: found.paymentMethod || 'No especificado',
          numeroSeguimiento: undefined
        };
        setPedido(pedidoObj);
      } catch (e) {
        setError('Error cargando el pedido');
      } finally {
        setIsLoading(false);
      }
    }
  }, [status, router, id]);

  // Generar pedido de prueba
  // Eliminada simulación

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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-6">
          <Link href="/mi-cuenta/pedidos" className="inline-flex items-center text-blue-600 hover:text-blue-800">
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            Volver a Mis pedidos
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">{error || "No se encontró el pedido"}</h3>
          <p className="text-gray-500 mb-4">El pedido que buscas no existe o no tienes acceso a él.</p>
          <Link
            href="/mi-cuenta/pedidos"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Ver todos mis pedidos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-6">
        <Link href="/mi-cuenta/pedidos" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Volver a Mis pedidos
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Encabezado del pedido */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pedido {pedido.id}</h1>
              <p className="text-sm text-gray-500 mt-1">Realizado el {pedido.fecha}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getEstadoColor(pedido.estado)}`}>
                {pedido.estado}
              </span>
            </div>
          </div>
        </div>

        {/* Información de seguimiento (si está disponible) */}
        {pedido.numeroSeguimiento && (
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <div>
                <h2 className="text-md font-medium text-blue-800">Información de seguimiento</h2>
                <p className="text-sm text-blue-700 mt-1">
                  Número de seguimiento: <span className="font-semibold">{pedido.numeroSeguimiento}</span>
                </p>
              </div>
              <div className="mt-3 md:mt-0">
                <a 
                  href="#" 
                  className="text-blue-700 hover:text-blue-900 text-sm font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("Esta función estaría conectada con el proveedor de logística real");
                  }}
                >
                  Seguir envío →
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
          {/* Productos */}
          <div className="md:col-span-2">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Productos</h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pedido.productos.map((producto) => (
                    <tr key={producto.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
                            {/* Imagen del producto (podría ser un placeholder) */}
                            <div className="h-full w-full bg-gray-200 flex items-center justify-center text-gray-500">
                              <span className="text-xs">Imagen</span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
                            <div className="text-sm text-gray-500">SKU: {producto.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${producto.precio.toFixed(2)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{producto.cantidad}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">${(producto.precio * producto.cantidad).toFixed(2)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Totales */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Subtotal</span>
                  <span className="text-sm text-gray-900">${pedido.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Envío</span>
                  <span className="text-sm text-gray-900">${pedido.envio.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Impuestos</span>
                  <span className="text-sm text-gray-900">${pedido.impuestos.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between font-medium">
                    <span className="text-base text-gray-900">Total</span>
                    <span className="text-base text-gray-900">${pedido.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Información del pedido */}
          <div>
            <div className="space-y-6">
              {/* Dirección de envío */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Dirección de envío</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-800 font-medium">{pedido.direccionEnvio.nombre}</p>
                  <p className="text-sm text-gray-600">
                    {pedido.direccionEnvio.calle} {pedido.direccionEnvio.numero}
                    {pedido.direccionEnvio.interior && `, Int. ${pedido.direccionEnvio.interior}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {pedido.direccionEnvio.colonia}, {pedido.direccionEnvio.codigoPostal}
                  </p>
                  <p className="text-sm text-gray-600">
                    {pedido.direccionEnvio.ciudad}, {pedido.direccionEnvio.estado}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Tel: {pedido.direccionEnvio.telefono}
                  </p>
                </div>
              </div>
              
              {/* Método de pago */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Método de pago</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-800">{pedido.metodoPago}</p>
                </div>
              </div>
              
              {/* Acciones */}
              <div className="space-y-3">
                {(pedido.estado === "Pendiente" || pedido.estado === "En proceso") && (
                  <button
                    className="w-full px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    onClick={() => alert("En una aplicación real, esto enviaría una solicitud de cancelación")}
                  >
                    Solicitar cancelación
                  </button>
                )}
                
                <button
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={() => window.print()}
                >
                  Imprimir pedido
                </button>
                
                {(pedido.estado === "Entregado") && (
                  <button
                    className="w-full px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    onClick={() => router.push(`/productos/resenas/nuevo?pedido=${pedido.id}`)}
                  >
                    Escribir reseña
                  </button>
                )}
              </div>
              
              {/* Ayuda */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2">¿Necesitas ayuda?</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Si tienes alguna pregunta sobre tu pedido, contáctanos.
                </p>
                <Link
                  href="/contacto"
                  className="text-sm font-medium text-blue-700 hover:text-blue-900"
                >
                  Contactar con soporte →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
