"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CheckIcon,
  TruckIcon,
  CreditCardIcon,
  DocumentDuplicateIcon,
  PrinterIcon
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
import PrintableInvoice from "@/components/PrintableInvoice";

import { StoreSettings } from "@/app/api/admin/settings/route";

type OrderItem = { id: string; name: string; price: number; quantity: number; image: string };
type OrderDetail = { id: string; date: string; customer: { name: string; email: string; phone: string }; shipping: { address: string; city: string; postalCode: string; country: string }; payment: { method: string; transactionId: string; status: string }; items: OrderItem[]; status: string; subtotal: number; shippingCost: number; taxes: number; total: number; notes: string };

function _OrderStatusBadge({ status }: { status: string }) {
  let bgColor = "";
  let textColor = "";
  switch (status) {
    case "Pendiente": bgColor = "bg-yellow-100"; textColor = "text-yellow-800"; break;
    case "Procesando": bgColor = "bg-blue-100"; textColor = "text-blue-800"; break;
    case "Enviado": bgColor = "bg-purple-100"; textColor = "text-purple-800"; break;
    case "Completado": bgColor = "bg-green-100"; textColor = "text-green-800"; break;
    case "Cancelado": bgColor = "bg-red-100"; textColor = "text-red-800"; break;
    default: bgColor = "bg-gray-100"; textColor = "text-gray-800";
  }
  return <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${bgColor} ${textColor}`}>{status}</span>;
}

export default function OrderDetailClient({ params }: { params: { id: string } }) {
  const { showToast } = useToast();
  const { id } = params;
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [newPaymentStatus, setNewPaymentStatus] = useState("");

  useEffect(() => {
    const fetchOrderAndSettings = async () => {
      if (!id) return; // Wait for id
      try {
        const [orderRes, settingsRes] = await Promise.all([
          fetch(`/api/admin/orders/${id}`),
          fetch(`/api/admin/settings`)
        ]);

        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setSettings(settingsData);
        }

        if (!orderRes.ok) {
          setLoading(false);
          return;
        }
        const found = await orderRes.json();

        const date = (found.created_at || found.date || new Date().toISOString()).toString();
        const itemsArray = Array.isArray(found.order_items) ? found.order_items : (Array.isArray(found.items) ? found.items : []);
        const addr = found.shipping_address || found.shippingAddress || {};

        // normalize shipping address
        const shippingAddressNormalized: any = (() => {
          if (!addr) return {};
          if (typeof addr === 'string') {
            return { formattedAddress: addr };
          }
          if (addr.formattedAddress) return addr;

          // Case: Structured address with calle/numero
          if (addr.calle || addr.ciudad || addr.codigoPostal) {
            const parts = [];
            if (addr.calle) parts.push(addr.calle);
            if (addr.numero) parts.push(addr.numero);
            if (addr.interior) parts.push(`Int. ${addr.interior}`);
            const formatted = parts.join(' ').trim();

            return {
              formattedAddress: formatted || addr.address || '',
              city: addr.ciudad || addr.city || null,
              postalCode: addr.codigoPostal || addr.postalCode || null,
              country: addr.estado || addr.country || null
            };
          }

          // Fallback for ShippingInfo structure from checkout
          // Ensure we don't return "undefined" string
          return {
            formattedAddress: addr.address || '',
            city: addr.city,
            state: addr.state, // Capture state/comuna
            postalCode: addr.zipCode,
            country: addr.country,
            phone: addr.phone,
            email: addr.email,
            fullName: addr.fullName
          };
        })();

        const items: OrderItem[] = itemsArray.map((it: any, idx: number) => ({
          id: it.product_id || it.id || `ITEM-${idx}`,
          name: it.name || it.title || `Producto ${idx + 1}`,
          price: Number(it.price) || 0,
          quantity: Number(it.quantity) || 1,
          image: it.image || '/file.svg'
        }));

        const subtotal = Number(found.subtotal) || items.reduce((s, it) => s + it.price * it.quantity, 0);
        const shippingCost = Number(found.shipping_cost) || Number(found.shippingCost) || 0;
        // If taxes are not stored, calculate them or assume included. Let's assume included or 0 for now if not in DB.
        const taxes = subtotal * 0.19;
        const total = Number(found.total) || (subtotal + shippingCost);

        // Construct city string with state/comuna if available
        const cityDisplay = shippingAddressNormalized.state
          ? `${shippingAddressNormalized.state}, ${shippingAddressNormalized.city || ''}`
          : (shippingAddressNormalized.city || addr.ciudad || found.city || '-');

        // Determine final address string, avoiding "undefined"
        let finalAddress = shippingAddressNormalized.formattedAddress;
        const isInvalidAddress = !finalAddress || String(finalAddress).trim() === 'undefined' || String(finalAddress).trim() === 'null' || String(finalAddress).trim() === '';

        if (isInvalidAddress) {
          // Try to construct from calle/numero if available in raw addr
          if (addr.calle) {
            finalAddress = `${addr.calle} ${addr.numero || ''} ${addr.interior ? 'Int. ' + addr.interior : ''}`.trim();
          } else {
            // Check if found.address exists and is valid
            const fallback = found.address;
            if (fallback && String(fallback).trim() !== 'undefined' && String(fallback).trim() !== 'null') {
              finalAddress = fallback;
            } else {
              finalAddress = 'Dirección no especificada';
            }
          }
        }

        // Clean up address: remove redundant city, state, country, zip if present in the address string
        // This fixes the issue where Google Autocomplete returns the full string and it looks duplicated
        if (finalAddress && typeof finalAddress === 'string') {
          const termsToRemove = [
            shippingAddressNormalized.country,
            shippingAddressNormalized.postalCode,
            shippingAddressNormalized.state,
            shippingAddressNormalized.city,
            'Chile' // Always try to remove country name if hardcoded
          ].filter(Boolean);

          termsToRemove.forEach(term => {
            if (term && term.length > 2) { // Only remove terms longer than 2 chars to avoid removing "RM" or similar if risky
              try {
                // Case insensitive replace, handling optional commas
                const regex = new RegExp(`,?\\s*${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
                finalAddress = finalAddress.replace(regex, '');
              } catch (_e) { }
            }
          });

          // Clean up messy commas left behind
          finalAddress = finalAddress
            .replace(/,(\s*,)+/g, ',') // Multiple commas to one
            .replace(/^,\s*/, '')       // Leading comma
            .replace(/,\s*$/, '')       // Trailing comma
            .trim();
        }

        const detail: OrderDetail = {
          id: found.id,
          date: date,
          customer: {
            name: addr.fullName || found.customer || found.cliente || addr.nombre || '-',
            email: addr.email || found.email || found.correo || '-',
            phone: addr.phone || addr.telefono || found.phone || '+00 000 0000'
          },
          shipping: {
            address: finalAddress,
            city: cityDisplay,
            postalCode: shippingAddressNormalized.postalCode || addr.codigoPostal || found.postalCode || '-',
            country: shippingAddressNormalized.country || addr.estado || found.country || '-'
          },
          payment: {
            method: found.payment_method || found.paymentMethod || 'No especificado',
            transactionId: found.transactionId || 'LOCAL-' + found.id,
            status: found.payment_status || 'pending'
          },
          status: found.status || found.estado || 'En proceso',
          items,
          subtotal,
          shippingCost,
          taxes,
          total,
          notes: found.notes || ''
        };
        setOrder(detail);
        setNewStatus(detail.status);
        setNewPaymentStatus(detail.payment.status);
      } catch (e) {
        console.error('Error cargando pedido', e);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderAndSettings();
  }, [id]);

  const handleStatusChange = async () => {
    if (order && (newStatus !== order.status || newPaymentStatus !== order.payment.status)) {
      try {
        setSaving(true);
        const res = await fetch(`/api/admin/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, payment_status: newPaymentStatus })
        });

        if (res.ok) {
          setOrder({ ...order, status: newStatus, payment: { ...order.payment, status: newPaymentStatus } });
          showToast('Estado actualizado correctamente', 'success');
        } else {
          showToast('Error al actualizar el estado', 'error');
        }
      } catch (error) {
        console.error("Error al actualizar el estado:", error);
        showToast('Error al actualizar el estado', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  const handlePrintInvoice = () => { window.print(); };

  if (loading) return (<div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div></div>);

  if (!order) return (<div className="text-center py-12"><h2 className="text-2xl font-bold text-gray-900">Pedido no encontrado</h2><p className="mt-2 text-gray-600">El pedido que buscas no existe o ha sido eliminado.</p><div className="mt-6"><Link href="/admin/pedidos"><Button aria-label="Volver a pedidos"><ArrowLeftIcon className="h-5 w-5 mr-2" />Volver a pedidos</Button></Link></div></div>);

  return (
    <>
      <PrintableInvoice order={order} settings={settings} />
      <div className="pb-12 print:hidden">
        <div className="flex justify-between items-center mb-6">
          <div>
            <Link href="/admin/pedidos" className="inline-flex items-center text-blue-600 hover:text-blue-800 print:hidden">
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              Volver a pedidos
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mt-2">Pedido {order.id}</h1>
            <p className="text-sm text-gray-500">Realizado el {new Date(order.date).toLocaleString()}</p>
          </div>
          <div className="flex space-x-3 print:hidden">
            <Button variant="outline" onClick={handlePrintInvoice}>
              <PrinterIcon className="h-5 w-5 mr-2" />
              Imprimir
            </Button>
            <Button variant="outline">
              <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
              Generar factura
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Products */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden print:shadow-none print:rounded-none print:mb-4">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Productos</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-md overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={item.image}
                                alt={item.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  const img = e.currentTarget as HTMLImageElement;
                                  if (!img.dataset.fallback) {
                                    img.dataset.fallback = '1';
                                    img.src = '/file.svg';
                                  }
                                }}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">SKU: {item.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          ${item.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payment & Shipping Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
              <div className="bg-white rounded-lg shadow-md overflow-hidden print:shadow-none print:rounded-none">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Información de envío</h2>
                </div>
                <div className="px-6 py-4">
                  <div className="flex items-start mb-4">
                    <TruckIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Dirección de entrega</p>
                      <p className="text-sm text-gray-500 mt-1">{order.shipping.address}</p>
                      <p className="text-sm text-gray-500">{order.shipping.city}, {order.shipping.postalCode}</p>
                      <p className="text-sm text-gray-500">{order.shipping.country}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="h-5 w-5 flex justify-center items-center mr-2">
                      <span className="text-gray-400 text-xs">@</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Contacto</p>
                      <p className="text-sm text-gray-500 mt-1">{order.customer.name}</p>
                      <p className="text-sm text-gray-500">{order.customer.email}</p>
                      <p className="text-sm text-gray-500">{order.customer.phone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md overflow-hidden print:shadow-none print:rounded-none">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Pago</h2>
                </div>
                <div className="px-6 py-4">
                  <div className="flex items-start mb-4">
                    <CreditCardIcon className="h-5 w-5 text-gray-400 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Método de pago</p>
                      <p className="text-sm text-gray-500 mt-1 capitalize">{order.payment.method}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">Estado del pago</p>
                      <p className="text-sm text-gray-500 mt-1 capitalize">{order.payment.status}</p>
                      <p className="text-xs text-gray-400 mt-1">ID: {order.payment.transactionId}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Status Card */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden print:hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Estado del pedido</h2>
              </div>
              <div className="px-6 py-4">
                <div className="mb-4">
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Cambiar estado</label>
                  <select
                    id="status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="Pendiente">Pendiente</option>
                    <option value="Procesando">Procesando</option>
                    <option value="Enviado">Enviado</option>
                    <option value="Completado">Completado</option>
                    <option value="Cancelado">Cancelado</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700 mb-1">Estado del pago</label>
                  <select
                    id="payment_status"
                    value={newPaymentStatus}
                    onChange={(e) => setNewPaymentStatus(e.target.value)}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="paid">Pagado</option>
                    <option value="failed">Fallido</option>
                    <option value="refunded">Reembolsado</option>
                  </select>
                </div>

                <Button
                  onClick={handleStatusChange}
                  disabled={saving || (newStatus === order.status && newPaymentStatus === order.payment.status)}
                  className="w-full justify-center"
                >
                  {saving ? 'Guardando...' : 'Actualizar estado'}
                </Button>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Historial</h3>
                  <div className="relative pl-4 border-l-2 border-gray-200 space-y-4">
                    <div className="relative">
                      <div className="absolute -left-[21px] bg-blue-500 h-3 w-3 rounded-full border-2 border-white"></div>
                      <p className="text-sm font-medium text-gray-900">Pedido realizado</p>
                      <p className="text-xs text-gray-500">{new Date(order.date).toLocaleString()}</p>
                    </div>
                    {/* More history items could go here */}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden print:shadow-none print:rounded-none">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Resumen de costos</h2>
              </div>
              <div className="px-6 py-4">
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-500">Subtotal</span>
                  <span className="text-sm font-medium text-gray-900">${order.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-500">Envío</span>
                  <span className="text-sm font-medium text-gray-900">${order.shippingCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-sm text-gray-500">Impuestos</span>
                  <span className="text-sm font-medium text-gray-900">${order.taxes.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-2 border-t border-gray-200 mt-2">
                  <span className="text-base font-medium text-gray-900">Total</span>
                  <span className="text-base font-bold text-gray-900">${order.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-white rounded-lg shadow-md overflow-hidden print:hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900">Notas del cliente</h2>
                </div>
                <div className="px-6 py-4">
                  <p className="text-sm text-gray-600">{order.notes}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
