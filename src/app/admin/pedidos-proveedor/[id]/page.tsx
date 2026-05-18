"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Upload, File, Trash2, Check, X } from "lucide-react";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { use } from "react";
import { StatusBadge } from "@/components/admin/shell";

interface SupplierOrder {
  id: string;
  supplier_id: string;
  supplier_name: string;
  supplier_whatsapp?: string;
  supplier_phone?: string;
  order_date: string;
  expected_date: string;
  delivered_date: string | null;
  status: string;
  payment_status: string;
  total: number;
  paid_amount: number;
  notes: string | null;
  payment_receipt_url: string | null;
  payment_receipt_name: string | null;
  invoice_url: string | null;
  invoice_name: string | null;
  items: Array<{
    id: string;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_cost: number;
    subtotal: number;
  }>;
}

export default function SupplierOrderDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;

  const [order, setOrder] = useState<SupplierOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<'receipt' | 'invoice' | null>(null);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/admin/supplier-orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'receipt' | 'invoice') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }

    // Validar tamaño (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      alert('El archivo no debe superar los 10MB');
      return;
    }

    try {
      setUploading(true);
      setUploadType(type);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('orderId', orderId);

      const response = await fetch(`/api/admin/supplier-orders/${orderId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(prev => prev ? { ...prev, ...data } : null);
        alert(`${type === 'receipt' ? 'Comprobante' : 'Factura'} subido exitosamente`);

        // Si se subió el comprobante de pago, marcar como pagado automáticamente
        if (type === 'receipt') {
          await markAsPaid();
        }
      } else {
        throw new Error('Error al subir archivo');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir el archivo');
    } finally {
      setUploading(false);
      setUploadType(null);
    }
  };

  const handleDeleteDocument = async (type: 'receipt' | 'invoice') => {
    if (!confirm(`¿Eliminar ${type === 'receipt' ? 'comprobante' : 'factura'}?`)) return;

    try {
      const response = await fetch(`/api/admin/supplier-orders/${orderId}/upload`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        setOrder(prev => {
          if (!prev) return null;
          if (type === 'receipt') {
            return { ...prev, payment_receipt_url: null, payment_receipt_name: null };
          } else {
            return { ...prev, invoice_url: null, invoice_name: null };
          }
        });
        alert('Documento eliminado');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Error al eliminar el documento');
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const response = await fetch(`/api/admin/supplier-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const deleteDraft = async () => {
    if (!order) return;
    if (order.status !== 'borrador') {
      alert('Solo se pueden eliminar pedidos en estado borrador.');
      return;
    }
    if (!confirm('¿Eliminar este borrador? No genera movimientos de stock; la accion es irreversible.')) return;
    try {
      const res = await fetch(`/api/admin/supplier-orders/${orderId}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudo eliminar');
      }
      window.location.href = '/admin/reabastecimiento?tab=pedidos';
    } catch (e: any) {
      alert(e.message || 'Error eliminando borrador');
    }
  };

  const generateWhatsAppMessage = () => {
    if (!order) return '';

    let message = `🛒 *Pedido #${order.id.slice(0, 8)}*\n\n`;
    message += `📅 Fecha esperada: ${new Date(order.expected_date).toLocaleDateString()}\n\n`;
    message += `*Productos:*\n`;

    order.items.forEach((item, index) => {
      message += `${index + 1}. ${item.product_name}\n`;
      message += `   • Código: ${item.product_sku}\n`;
      message += `   • Cantidad: ${item.quantity}\n`;
      message += `   • Precio unit.: $${item.unit_cost.toFixed(2)} (aprox.)\n`;
      message += `   • Subtotal: $${item.subtotal.toFixed(2)}\n\n`;
    });

    message += `💰 *Total aproximado: $${order.total.toFixed(2)}*\n`;

    if (order.notes) {
      message += `\n📝 Notas:\n${order.notes}`;
    }

    return message;
  };

  const sendWhatsApp = async () => {
    if (!order) return;

    const message = generateWhatsAppMessage();
    const phone = (order.supplier_whatsapp || order.supplier_phone || '').replace(/\D/g, '');

    if (!phone) {
      alert('Este proveedor no tiene WhatsApp configurado');
      return;
    }

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    // Cambiar estado a "enviado_por_whatsapp" si está en "pendiente" o "confirmado"
    if (order.status === 'pendiente' || order.status === 'confirmado') {
      await updateStatus('enviado_por_whatsapp');
    }
  };

  const markAsPaid = async () => {
    if (!order) return;

    try {
      const response = await fetch(`/api/admin/supplier-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paid_amount: order.total, // Marcar como pagado completo
          payment_status: 'pagado'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrder(data);
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      alert('Error al marcar como pagado');
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Pedido no encontrado</p>
        </div>
      </div>
    );
  }

  const canManage = !["gestionado", "recibido", "cancelado"].includes(
    order.status
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Link
        href="/admin/reabastecimiento?tab=pedidos"
        className="inline-flex items-center text-gray-600 hover:text-gray-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a pedidos
      </Link>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Pedido #{order.id.slice(0, 8)}
          </h1>
          <p className="text-gray-600 mt-1">
            Proveedor: <span className="font-semibold">{order.supplier_name}</span>
          </p>
        </div>

        <StatusBadge status={order.status} />
      </div>

      {/* Borrador banner (generado por motor de reposicion) */}
      {order.status === 'borrador' && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-slate-500">Borrador</div>
            <div className="text-base font-semibold text-slate-900 mt-0.5">
              Pedido sugerido pendiente de revision
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Revisa cantidades y costos antes de confirmar. Al confirmar pasa a <b>pendiente</b> y queda listo para enviar al proveedor.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => updateStatus('pendiente')}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold"
            >
              Confirmar borrador
            </button>
            <button
              onClick={deleteDraft}
              className="px-4 py-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-sm font-bold"
            >
              Eliminar
            </button>
          </div>
        </div>
      )}

      {/* Gestión del Pedido — visible solo en estados pre-recepción */}
      {canManage && (
        <div className="bg-white rounded-2xl ring-1 ring-gray-200 p-5 sm:p-6 mb-6">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                ¿Cómo procesamos este pedido?
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Marcalo como gestionado cuando ya contactaste al proveedor.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => updateStatus("gestionado")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition active:scale-[0.98] min-h-[44px]"
            >
              <Check className="h-4 w-4" />
              Marcar como gestionado
            </button>

            <button
              type="button"
              onClick={sendWhatsApp}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white ring-1 ring-gray-200 hover:ring-emerald-300 hover:text-emerald-700 text-gray-700 text-sm font-bold transition active:scale-[0.98] min-h-[44px]"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              {order.status === "enviado_por_whatsapp"
                ? "Reabrir WhatsApp"
                : "Enviar por WhatsApp"}
            </button>
          </div>

          {order.status === "enviado_por_whatsapp" && (
            <p className="mt-3 text-xs text-purple-700 bg-purple-50 ring-1 ring-purple-200 rounded-lg px-3 py-2">
              Pedido enviado por WhatsApp. Marcalo como gestionado cuando el
              proveedor confirme.
            </p>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items del pedido */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Productos</h2>

            {/* Vista Móvil (Cards) */}
            <div className="md:hidden space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4 space-y-2 border border-gray-100">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="text-sm font-bold text-gray-900">{item.product_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">{item.product_sku}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-black text-emerald-600">${item.subtotal.toFixed(2)}</div>
                      <div className="text-[10px] text-gray-400 uppercase font-bold">Subtotal</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-2 border-t border-gray-200">
                    <div className="flex flex-col">
                      <span className="text-gray-400 font-medium">Cantidad:</span>
                      <span className="text-gray-700 font-bold">{item.quantity}</span>
                    </div>
                    <div className="text-right flex flex-col">
                      <span className="text-gray-400 font-medium">Precio Unit.:</span>
                      <span className="text-gray-700 font-bold">${item.unit_cost.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="bg-emerald-50 rounded-lg p-4 flex justify-between items-center border border-emerald-100 mt-4">
                <span className="text-sm font-bold text-emerald-800 uppercase tracking-wider">Total Pedido:</span>
                <span className="text-lg font-black text-emerald-900">${order.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Vista Desktop (Tabla) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      SKU
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Precio Unit.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Subtotal
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{item.product_sku}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">${item.unit_cost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium">${item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-semibold">
                    <td colSpan={4} className="px-4 py-3 text-right">Total:</td>
                    <td className="px-4 py-3 text-right">${order.total.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas */}
          {order.notes && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-2">Notas</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Columna lateral */}
        <div className="space-y-6">
          {/* Información del pedido */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Información</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Fecha de pedido</p>
                <p className="font-medium">{new Date(order.order_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha esperada</p>
                <p className="font-medium">{new Date(order.expected_date).toLocaleDateString()}</p>
              </div>
              {order.delivered_date && (
                <div>
                  <p className="text-sm text-gray-600">Fecha de entrega</p>
                  <p className="font-medium">{new Date(order.delivered_date).toLocaleDateString()}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Estado de pago</p>
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium capitalize">{order.payment_status}</p>
                  {order.payment_status !== 'pagado' && (
                    <button
                      onClick={markAsPaid}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      title="Marcar como pagado"
                    >
                      Marcar pagado
                    </button>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600">Monto pagado</p>
                <p className="font-medium">${order.paid_amount.toFixed(2)} / ${order.total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div className="bg-white border rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Documentos</h2>

            {/* Comprobante de pago */}
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Comprobante de pago</p>
              {order.payment_receipt_url ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <a
                      href={order.payment_receipt_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate"
                    >
                      {order.payment_receipt_name || 'Ver comprobante'}
                    </a>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument('receipt')}
                    className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                  <Upload className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {uploading && uploadType === 'receipt' ? 'Subiendo...' : 'Subir comprobante'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileUpload(e, 'receipt')}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* Factura */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Factura del proveedor</p>
              {order.invoice_url ? (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <a
                      href={order.invoice_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline truncate"
                    >
                      {order.invoice_name || 'Ver factura'}
                    </a>
                  </div>
                  <button
                    onClick={() => handleDeleteDocument('invoice')}
                    className="ml-2 p-1 text-red-600 hover:bg-red-50 rounded flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition">
                  <Upload className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    {uploading && uploadType === 'invoice' ? 'Subiendo...' : 'Subir factura'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => handleFileUpload(e, 'invoice')}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Formatos: JPG, PNG, PDF (máx. 10MB)
            </p>
          </div>

          {/* Acciones rápidas (Solo disponibles si no está cancelado) */}
          {order.status !== 'cancelado' && order.status !== 'recibido' && (
            <div className="bg-white border rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">Acciones</h2>
              <div className="space-y-4">
                {order.status === 'gestionado' && (
                  <div>
                    <button
                      onClick={() => updateStatus('recibido')}
                      className="w-full px-4 py-3 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
                    >
                      <Check className="h-5 w-5" />
                      Marcar como Recibido
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      ⚠️ Al marcar como recibido, el stock de los productos se incrementará automáticamente.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Botón de cancelar separado */}
          {order.status !== 'cancelado' && (
            <div className="bg-white border rounded-lg p-6 mt-6">
              <h2 className="text-lg font-semibold mb-4 text-red-700">Zona de Peligro</h2>
              <button
                onClick={() => {
                  const msg = order.status === 'recibido'
                    ? '¿Estás seguro? Al cancelar un pedido ya recibido SE DESCONTARÁ EL STOCK ingresado automáticamente. Esta acción no se puede deshacer.'
                    : '¿Estás seguro de que deseas cancelar este pedido? Esta acción no se puede deshacer.';
                  if (confirm(msg)) {
                    updateStatus('cancelado');
                  }
                }}
                className="w-full px-4 py-2 border-2 border-red-600 text-red-600 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2 font-medium transition active:scale-[0.98]"
              >
                <X className="h-4 w-4" />
                Cancelar Pedido
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
