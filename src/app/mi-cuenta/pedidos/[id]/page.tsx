"use client";

import { useState, useEffect, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import PrintableInvoice from "@/components/PrintableInvoice";
import { leerEstadoUber } from "@/lib/uber-status";

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
  email: string;
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
  /** El estado del pago, tal como lo dice la base. */
  estadoPago: string;
  numeroSeguimiento?: string;
  urlSeguimiento?: string;
  /** Estado del repartidor, sólo en los pedidos con envío flash. */
  flash?: { etiqueta: string; trackingUrl: string | null };
};

/**
 * El estado del repartidor, como se lo cuenta al cliente.
 *
 * Las etiquetas no son las mismas que ve la tienda: al cliente no le sirve
 * "no se pudo crear la entrega", le sirve saber que su pedido igual va a
 * llegar. Los pedidos despachados antes de que existieran las columnas
 * `express_*` se leen del JSON de la dirección.
 */
function leerFlash(found: any, addr: any): { etiqueta: string; trackingUrl: string | null } | undefined {
  const esFlash = (found.shipping_method || '').toLowerCase() === 'flash';
  const deliveryId = found.express_delivery_id || addr?.uberDeliveryId || null;
  if (!esFlash && !deliveryId) return undefined;

  const trackingUrl = found.express_tracking_url || addr?.uberTracking || null;
  const estadoCrudo = found.express_status || (deliveryId ? 'pending' : '');

  const etiquetas: Record<string, string> = {
    pending: 'Estamos asignando un repartidor a tu pedido.',
    pickup: 'El repartidor va camino al local a buscar tu pedido.',
    pickup_complete: 'El repartidor ya tiene tu pedido.',
    dropoff: 'Tu pedido va en camino.',
    delivered: 'Tu pedido fue entregado.',
    canceled: 'Hubo un problema con el repartidor. Estamos reorganizando tu entrega.',
    returned: 'Tu pedido volvió al local. Nos vamos a contactar contigo.',
    // Lo escribe el webhook de pago cuando Uber no aceptó la entrega: el pedido
    // está pagado y la tienda lo despacha igual.
    failed: 'Estamos coordinando tu entrega. Te avisamos apenas salga.',
  };

  const etiqueta =
    etiquetas[estadoCrudo] ||
    (deliveryId ? leerEstadoUber(estadoCrudo).etiqueta : 'Preparando tu envío flash.');

  return { etiqueta, trackingUrl };
}

export default function DetallePedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      const fetchOrder = async () => {
        try {
          const res = await fetch(`/api/orders/${id}`);
          if (!res.ok) {
            setError('No se encontró el pedido');
            setIsLoading(false);
            return;
          }
          const found = await res.json();

          const items = Array.isArray(found.order_items) ? found.order_items : (Array.isArray(found.items) ? found.items : []);
          const productos: ProductoEnPedido[] = items.map((it: any, idx: number) => ({
            id: it.product_id || it.id || `ITEM-${idx}`,
            nombre: it.name || it.nombre || `Producto ${idx + 1}`,
            precio: Number(it.price) || 0,
            cantidad: Number(it.quantity) || 1,
            imagenUrl: it.image || '/file.svg'
          }));

          const subtotal = Number(found.subtotal) || productos.reduce((s, p) => s + p.precio * p.cantidad, 0);
          const envio = Number(found.shipping_cost) || 0;
          const impuestos = Number(found.tax) || 0;

          const direccion = found.shipping_address || {};
          // normalize address
          const normalizedAddr: any = (() => {
            if (!direccion) return {};
            if (typeof direccion === 'string') return { formattedAddress: direccion };
            if (direccion.formattedAddress) return direccion;
            if (direccion.address) return {
              formattedAddress: direccion.address,
              city: direccion.city,
              postalCode: direccion.zipCode,
              country: direccion.country,
              phone: direccion.phone,
              email: direccion.email,
              fullName: direccion.fullName
            };
            return direccion;
          })();

          const direccionEnvio: DatosDireccion = {
            nombre: normalizedAddr.fullName || normalizedAddr.nombre || found.customer || '-',
            email: normalizedAddr.email || found.email || found.correo || '-',
            calle: normalizedAddr.formattedAddress ? String(normalizedAddr.formattedAddress).split(',')[0] : (normalizedAddr.calle || '-'),
            numero: normalizedAddr.numero || '',
            interior: normalizedAddr.interior || '',
            colonia: normalizedAddr.colonia || '-',
            ciudad: normalizedAddr.city || normalizedAddr.ciudad || '-',
            estado: normalizedAddr.estado || normalizedAddr.state || '-',
            codigoPostal: normalizedAddr.postalCode || normalizedAddr.codigoPostal || normalizedAddr.zipCode || '-',
            telefono: normalizedAddr.phone || normalizedAddr.telefono || '+00 000 0000'
          };

          const pedidoObj: Pedido = {
            id: found.id,
            fecha: (found.created_at || found.fecha || found.date || '').toString().split('T')[0] || '-',
            subtotal,
            envio,
            impuestos,
            total: Number(found.total) || (subtotal + envio + impuestos),
            estado: found.status || found.estado || 'En proceso',
            productos,
            direccionEnvio,
            metodoPago: found.payment_method || found.paymentMethod || 'No especificado',
            estadoPago: String(found.payment_status || 'pending').toLowerCase(),
            numeroSeguimiento: found.tracking_number || found.trackingNumber || undefined,
            urlSeguimiento: found.tracking_url || found.trackingUrl || undefined,
            // La dirección cruda y no la normalizada: el normalizador arma
            // un objeto con campos elegidos a mano y deja fuera el seguimiento
            // de Uber, que es justo lo que hace falta acá.
            flash: leerFlash(found, direccion)
          };
          setPedido(pedidoObj);
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          setError('Error cargando el pedido');
        } finally {
          setIsLoading(false);
        }
      };
      fetchOrder();
    }
  }, [status, router, id]);

  // Generar pedido de prueba
  // Eliminada simulación

  // Obtener la etiqueta legible según estado
  const getEstadoLabel = (estado: string): string => {
    const norm = (estado || '').toLowerCase().trim();
    switch (norm) {
      case "entregado":
      case "delivered":
      case "completado":
      case "completed":
        return "Entregado";
      case "enviado":
      case "shipped":
        return "Enviado";
      case "en proceso":
      case "processing":
      case "procesando":
      case "preparando":
        return "En preparación";
      case "cancelado":
      case "cancelled":
      case "canceled":
        return "Cancelado";
      case "pendiente":
      case "pending":
        return "Pendiente";
      default:
        return estado || "En proceso";
    }
  };

  // Obtener el color de badge según estado
  const getEstadoColor = (estado: string): string => {
    const norm = (estado || '').toLowerCase().trim();
    switch (norm) {
      case "entregado":
      case "delivered":
      case "completado":
      case "completed":
        return "bg-green-100 text-green-800";
      case "en proceso":
      case "processing":
      case "procesando":
      case "preparando":
        return "bg-amber-100 text-amber-800";
      case "enviado":
      case "shipped":
        return "bg-blue-100 text-blue-800";
      case "cancelado":
      case "cancelled":
      case "canceled":
        return "bg-red-100 text-red-800";
      case "pendiente":
      case "pending":
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

  const invoiceOrder = pedido ? {
    id: pedido.id,
    date: pedido.fecha,
    customer: {
      name: pedido.direccionEnvio.nombre,
      email: pedido.direccionEnvio.email,
      phone: pedido.direccionEnvio.telefono
    },
    shipping: {
      address: `${pedido.direccionEnvio.calle} ${pedido.direccionEnvio.numero} ${pedido.direccionEnvio.interior ? 'Int. ' + pedido.direccionEnvio.interior : ''}, ${pedido.direccionEnvio.colonia}`,
      city: pedido.direccionEnvio.ciudad,
      postalCode: pedido.direccionEnvio.codigoPostal,
      country: pedido.direccionEnvio.estado
    },
    items: pedido.productos.map(p => ({
      id: p.id,
      name: p.nombre,
      quantity: p.cantidad,
      price: p.precio
    })),
    subtotal: pedido.subtotal,
    shippingCost: pedido.envio,
    total: pedido.total,
    payment: {
      method: pedido.metodoPago,
      // El estado del pago sale de `payment_status`, no del estado del pedido.
      // Antes se derivaba comparando `estado === 'Pendiente'`, y `estado` vale
      // `'pending'` en inglés minúscula: la comparación nunca era cierta, así
      // que el comprobante de un pedido **sin pagar** salía como pagado.
      status: pedido.estadoPago === 'paid' ? 'paid' : 'pending'
    }
  } : null;

  return (
    <>
      {invoiceOrder && <PrintableInvoice order={invoiceOrder} />}
      <div className="container mx-auto px-4 py-8 max-w-6xl print:hidden">
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
                  {getEstadoLabel(pedido.estado)}
                </span>
              </div>
            </div>
          </div>

          {/* Envío flash: el estado del repartidor, en vivo */}
          {pedido.flash && (
            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center">
                <div>
                  <h2 className="text-md font-medium text-blue-800">Tu pedido con envío flash</h2>
                  <p className="text-sm text-blue-700 mt-1">{pedido.flash.etiqueta}</p>
                </div>
                {pedido.flash.trackingUrl && (
                  <div className="mt-3 md:mt-0">
                    <a
                      href={pedido.flash.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                    >
                      Ver repartidor en vivo →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

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
                    href={pedido.urlSeguimiento || `https://seguimiento.chilexpress.cl/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
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
                          <div className="text-sm text-gray-900">${Math.round(producto.precio).toLocaleString('es-CL')}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{producto.cantidad}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">${Math.round(producto.precio * producto.cantidad).toLocaleString('es-CL')}</div>
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
                    <span className="text-sm text-gray-900">${Math.round(pedido.subtotal).toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Envío</span>
                    <span className="text-sm text-gray-900">
                      {pedido.envio > 0 ? `$${Math.round(pedido.envio).toLocaleString('es-CL')}` : 'Gratis'}
                    </span>
                  </div>
                  {pedido.impuestos > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Impuestos</span>
                      <span className="text-sm text-gray-900">${Math.round(pedido.impuestos).toLocaleString('es-CL')}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    <div className="flex justify-between font-medium">
                      <span className="text-base text-gray-900">Total</span>
                      <span className="text-base text-gray-900 font-bold">${Math.round(pedido.total).toLocaleString('es-CL')}</span>
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

                {/* El estado del pago, dicho claro. La página mostraba sólo
                    "Mercadopago" y el cliente no tenía cómo saber si su pago
                    había entrado: un pedido a medio pagar se leía igual que
                    uno pagado. */}
                {pedido.estadoPago !== 'paid' && (
                  <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-sm font-semibold text-amber-900">
                      {pedido.estadoPago === 'pending'
                        ? 'Pago pendiente'
                        : 'El pago no se completó'}
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                      {pedido.estadoPago === 'pending'
                        ? 'Todavía no recibimos la confirmación de tu pago. Si ya pagaste, se acredita en unos minutos. Este pedido no se prepara hasta entonces.'
                        : 'Puedes volver a intentarlo desde el detalle de tu pedido.'}
                    </p>
                  </div>
                )}

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
    </>
  );
}
