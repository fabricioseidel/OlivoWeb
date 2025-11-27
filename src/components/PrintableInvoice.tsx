import React from 'react';
import { StoreSettings } from "@/app/api/admin/settings/route";

interface PrintableInvoiceProps {
  order: {
    id: string;
    date: string;
    customer: {
      name: string;
      email: string;
      phone: string;
    };
    shipping: {
      address: string;
      city: string;
      postalCode: string;
      country: string;
    };
    items: {
      id: string;
      name: string;
      quantity: number;
      price: number;
    }[];
    subtotal: number;
    shippingCost: number;
    total: number;
    payment: {
        method: string;
        status: string;
    };
  };
  settings?: StoreSettings | null;
}

export default function PrintableInvoice({ order, settings }: PrintableInvoiceProps) {
  const storeName = settings?.storeName || "OLIVO MARKET";
  const storeAddress = settings?.storeAddress || "Av. Principal 123";
  const storeCity = settings?.storeCity || "Santiago";
  const storeCountry = settings?.storeCountry || "Chile";
  const storeEmail = settings?.storeEmail || "contacto@olivomarket.com";
  const storePhone = settings?.storePhone || "";

  return (
    <div className="hidden print:block bg-white p-8 text-black max-w-[210mm] mx-auto font-sans">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight uppercase">{storeName}</h1>
          <p className="text-sm text-gray-600 mt-1 font-medium">Tu tienda de confianza</p>
          <div className="mt-4 text-sm text-gray-700">
            <p>{storeAddress}</p>
            <p>{storeCity}, {storeCountry}</p>
            <p>{storeEmail}</p>
            {storePhone && <p>{storePhone}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-900 uppercase">Orden de Compra</h2>
          <p className="text-xl font-mono font-bold text-gray-900 mt-2">#{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="text-sm text-gray-600 mt-1">Fecha: {new Date(order.date).toLocaleDateString()}</p>
          <div className={`mt-4 inline-block px-4 py-1 border-2 ${order.payment.status === 'paid' || order.payment.status === 'Aprobado' ? 'border-gray-900 text-gray-900' : 'border-gray-400 text-gray-500'} rounded-sm text-sm font-bold uppercase`}>
            {order.payment.status === 'pending' ? 'Pendiente de Pago' : (order.payment.status === 'paid' || order.payment.status === 'Aprobado' ? 'Pagado' : order.payment.status)}
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-12 mb-10">
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Datos del Cliente</h3>
          <div className="text-sm text-gray-900">
            <p className="font-bold text-lg mb-1">{order.customer.name}</p>
            <p className="mb-1">{order.customer.email}</p>
            <p>{order.customer.phone}</p>
          </div>
        </div>
        
        {/* Shipping Label Style Box */}
        <div className="border-4 border-gray-900 p-6">
          <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-3 border-b border-gray-900 pb-2">Dirección de Envío</h3>
          <div className="text-base text-gray-900 font-medium leading-relaxed">
            <p className="text-xl font-bold mb-2">{order.customer.name}</p>
            <p>{order.shipping.address}</p>
            <p>{order.shipping.city}, {order.shipping.postalCode}</p>
            <p className="uppercase font-bold mt-1">{order.shipping.country}</p>
            <p className="mt-3 text-sm text-gray-600">Tel: {order.customer.phone}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-8">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-gray-900">
              <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider">Descripción</th>
              <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider text-right">Cant.</th>
              <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider text-right">Precio Unit.</th>
              <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-wider text-right">Total</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {order.items.map((item, idx) => (
              <tr key={idx} className="border-b border-gray-300">
                <td className="py-4 text-gray-900">
                    <p className="font-bold text-base">{item.name}</p>
                    <p className="text-xs text-gray-500">SKU: {item.id}</p>
                </td>
                <td className="py-4 text-right text-gray-900 font-medium">{item.quantity}</td>
                <td className="py-4 text-right text-gray-900">${item.price.toLocaleString('es-CL')}</td>
                <td className="py-4 text-right text-gray-900 font-bold">${(item.price * item.quantity).toLocaleString('es-CL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-12">
        <div className="w-72">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Subtotal</span>
            <span className="text-sm font-medium text-gray-900">${order.subtotal.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-sm text-gray-600">Envío</span>
            <span className="text-sm font-medium text-gray-900">${order.shippingCost.toLocaleString('es-CL')}</span>
          </div>
          <div className="flex justify-between py-4 border-t-2 border-gray-900 mt-2">
            <span className="text-xl font-bold text-gray-900">Total</span>
            <span className="text-xl font-bold text-gray-900">${order.total.toLocaleString('es-CL')}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-900 pt-6 text-center text-sm text-gray-500">
        <p className="font-bold text-gray-900 mb-1">¡Gracias por tu compra!</p>
        <p>Si tienes dudas sobre tu pedido, contáctanos en soporte@olivomarket.com</p>
      </div>
    </div>
  );
}
