"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeftIcon, 
  CheckIcon,
  TruckIcon,
  XMarkIcon,
  ClockIcon,
  CreditCardIcon,
  DocumentDuplicateIcon,
  PrinterIcon
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";

type OrderItem = { id: string; name: string; price: number; quantity: number; image: string };
type OrderDetail = { id: string; date: string; customer: { name: string; email: string; phone: string }; shipping: { address: string; city: string; postalCode: string; country: string }; payment: { method: string; transactionId: string; status: string }; items: OrderItem[]; status: string; subtotal: number; shippingCost: number; taxes: number; total: number; notes: string };

function OrderStatusBadge({ status }: { status: string }) {
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem('orders');
      if (!raw) { setLoading(false); return; }
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) { setLoading(false); return; }
      const found = arr.find((o: any) => o.id === id);
      if (!found) { setLoading(false); return; }
      const date = (found.date || found.fecha || new Date().toISOString()).toString();
      const itemsArray = Array.isArray(found.items) ? found.items : [];
      const addr = found.shippingAddress || {};
      const items: OrderItem[] = itemsArray.map((it: any, idx: number) => ({ id: it.id?.toString() || `ITEM-${idx}`, name: it.name || it.title || `Producto ${idx+1}`, price: Number(it.price) || 0, quantity: Number(it.quantity) || 1, image: it.image || '/file.svg' }));
      const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const shippingCost = 10;
      const taxes = subtotal * 0.19;
      const total = subtotal + shippingCost;
      const detail: OrderDetail = { id: found.id, date: date.length > 10 ? date : `${date} 00:00:00`, customer: { name: found.customer || found.cliente || addr.nombre || '-', email: found.email || found.correo || '-', phone: addr.telefono || found.phone || '+00 000 0000' }, shipping: { address: addr.calle ? `${addr.calle} ${addr.numero || ''}${addr.interior ? ' Int. '+addr.interior : ''}`.trim() : (found.address || 'Dirección no especificada'), city: addr.ciudad || found.city || '-', postalCode: addr.codigoPostal || found.postalCode || '-', country: addr.estado || found.country || '-' }, payment: { method: found.paymentMethod || 'No especificado', transactionId: found.transactionId || 'LOCAL-' + found.id, status: 'Aprobado' }, status: found.status || found.estado || 'En proceso', items, subtotal, shippingCost, taxes, total, notes: found.notes || '' };
      setOrder(detail); setNewStatus(detail.status);
    } catch (e) { console.error('Error cargando pedido', e); } finally { setLoading(false); }
  }, [id]);

  const handleStatusChange = async () => {
    if (order && newStatus !== order.status) {
      try {
        setSaving(true);
        await new Promise(r => setTimeout(r, 200));
        setOrder({ ...order, status: newStatus });
        try {
          const raw = localStorage.getItem('orders');
          if (raw) {
            const list = JSON.parse(raw);
            if (Array.isArray(list)) {
              const updated = list.map((o: any) => o.id === order.id ? { ...o, status: newStatus } : o);
              localStorage.setItem('orders', JSON.stringify(updated));
              showToast('Estado actualizado correctamente', 'success');
            }
          }
        } catch {
          showToast('Error al guardar el estado en localStorage', 'error');
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
    <div className="pb-12"> 
      {/* header & summary omitted for brevity inline to keep file compact */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <Link href="/admin/pedidos" className="inline-flex items-center text-blue-600 hover:text-blue-800"><ArrowLeftIcon className="h-5 w-5 mr-1" />Volver a pedidos</Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">Pedido {order.id}</h1>
          <p className="text-sm text-gray-500">Realizado el {new Date(order.date).toLocaleString()}</p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={handlePrintInvoice}><PrinterIcon className="h-5 w-5 mr-2" />Imprimir</Button>
          <Button variant="outline"><DocumentDuplicateIcon className="h-5 w-5 mr-2" />Generar factura</Button>
        </div>
      </div>

      {/* keep products and totals compact */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200"><h2 className="text-xl font-semibold text-gray-900">Productos</h2></div>
        <div className="overflow-x-auto"><table className="min-w-full divide-y divide-gray-200"><thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Precio</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th><th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th></tr></thead>
          <tbody className="bg-white divide-y divide-gray-200">{order.items.map((item) => (<tr key={item.id}><td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-md overflow-hidden"><img src={item.image} alt={item.name} className="h-full w-full object-cover" onError={(e) => { const img = e.currentTarget as HTMLImageElement; if (!img.dataset.fallback) { img.dataset.fallback = '1'; img.src = '/file.svg'; } }} /></div><div className="ml-4"><div className="text-sm font-medium text-gray-900">{item.name}</div><div className="text-sm text-gray-500">SKU: {item.id}</div></div></div></td><td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">${item.price.toFixed(2)}</td><td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">{item.quantity}</td><td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</td></tr>))}</tbody></table></div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden"><div className="px-6 py-4 border-b border-gray-200"><h2 className="text-xl font-semibold text-gray-900">Resumen de costos</h2></div><div className="px-6 py-4"><div className="flex justify-between py-2"><span className="text-sm text-gray-500">Subtotal</span><span className="text-sm font-medium text-gray-900">${order.subtotal.toFixed(2)}</span></div><div className="flex justify-between py-2"><span className="text-sm text-gray-500">Envío</span><span className="text-sm font-medium text-gray-900">${order.shippingCost.toFixed(2)}</span></div><div className="flex justify-between py-2"><span className="text-sm text-gray-500">Impuestos</span><span className="text-sm font-medium text-gray-900">${order.taxes.toFixed(2)}</span></div><div className="flex justify-between py-2 border-t border-gray-200 mt-2"><span className="text-base font-medium text-gray-900">Total</span><span className="text-base font-bold text-gray-900">${order.total.toFixed(2)}</span></div></div></div>
    </div>
  );
}
