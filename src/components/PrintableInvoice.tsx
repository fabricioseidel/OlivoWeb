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
    <div className="hidden print:block bg-white text-black max-w-[210mm] mx-auto font-sans relative">
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            background-color: white !important; 
          }
        }
      `}</style>

      {/* Modern Header Banner */}
      <div className="flex justify-between items-start border-b-[6px] border-emerald-600 pb-8 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-2xl">
              {storeName[0]}
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase">{storeName}</h1>
              <p className="text-sm font-bold text-gray-500 tracking-widest uppercase">Tu tienda de confianza</p>
            </div>
          </div>
          
          <div className="mt-6 text-sm text-gray-600 leading-relaxed font-medium">
            <p>{storeAddress}</p>
            <p>{storeCity}, {storeCountry}</p>
            <p className="mt-2 text-emerald-700 font-bold">{storeEmail}</p>
            {storePhone && <p>{storePhone}</p>}
          </div>
        </div>
        
        <div className="text-right">
          <h2 className="text-4xl font-black text-emerald-600 tracking-tight uppercase mb-2">FACTURA</h2>
          <div className="inline-block bg-gray-50 border border-gray-200 rounded-xl px-5 py-3 mt-2 text-right">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nº de Documento</p>
            <p className="text-xl font-black text-gray-900">#{(order.id || '').slice(0, 8).toUpperCase()}</p>
          </div>
          
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Fecha de Emisión</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{new Date(order.date).toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-8 mb-12">
        {/* Customer Details */}
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              {order.customer.name[0]?.toUpperCase() || 'C'}
            </div>
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Facturar A</h3>
          </div>
          <div className="text-sm leading-relaxed">
            <p className="font-black text-xl text-gray-900 mb-2">{order.customer.name}</p>
            <p className="text-gray-600 font-medium">{order.customer.email}</p>
            {order.customer.phone && <p className="text-gray-600 font-medium mt-1">{order.customer.phone}</p>}
          </div>
        </div>
        
        {/* Shipping Label Box */}
        <div className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 relative overflow-hidden">
          {/* Watermark icon visually */}
          <div className="absolute -right-4 -top-4 text-emerald-200/40 opacity-50 text-[100px] leading-none pointer-events-none">📍</div>
          <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4">Dirección de Entrega</h3>
          <div className="text-sm font-medium text-gray-800 leading-relaxed relative z-10">
            <p>{order.shipping.address}</p>
            <p>{order.shipping.city}, {order.shipping.postalCode}</p>
            <p className="font-black text-gray-900 mt-2">{order.shipping.country}</p>
          </div>
        </div>
      </div>

      {/* Items Table Modernized */}
      <div className="mb-10 overflow-hidden rounded-2xl border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="py-4 px-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Descripción del Artículo</th>
              <th className="py-4 px-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Cant.</th>
              <th className="py-4 px-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Precio Unitario</th>
              <th className="py-4 px-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Total</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-100">
            {order.items.map((item, idx) => (
              <tr key={idx} className="bg-white">
                <td className="py-5 px-6">
                    <p className="font-black text-gray-900 text-base">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-1 uppercase tracking-wider font-medium">Ref: {item.id}</p>
                </td>
                <td className="py-5 px-6 text-right text-gray-900 font-bold">{item.quantity}</td>
                <td className="py-5 px-6 text-right text-gray-600 font-medium">${item.price.toLocaleString('es-CL')}</td>
                <td className="py-5 px-6 text-right text-gray-900 font-black">${(item.price * item.quantity).toLocaleString('es-CL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-between items-end mb-16">
        <div className="w-1/2 pr-12">
          {/* Payment Status Label */}
          <div className="mb-4">
             <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Estado del Pago</h3>
             <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider ${
               order.payment.status === 'paid' || order.payment.status === 'Aprobado' || order.payment.status === 'completado'
                 ? 'bg-emerald-100 text-emerald-700'
                 : order.payment.status === 'canceled' || order.payment.status === 'fallido' 
                 ? 'bg-red-100 text-red-700'
                 : 'bg-amber-100 text-amber-700'
             }`}>
               <div className="w-2 h-2 rounded-full bg-current"></div>
               {order.payment.status === 'pending' || order.payment.status === 'Pendiente' ? 'Pendiente' : 
                (order.payment.status === 'paid' || order.payment.status === 'Aprobado' || order.payment.status === 'completado' ? 'Pagado' : order.payment.status)}
             </div>
             
             <p className="text-xs font-medium text-gray-500 mt-3">
               Método utilizado: <span className="font-bold text-gray-800 uppercase">{order.payment.method}</span>
             </p>
          </div>
        </div>

        <div className="w-80 bg-gray-50 p-6 rounded-2xl border border-gray-100">
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Subtotal neto</span>
              <span>${order.subtotal.toLocaleString('es-CL')}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-600">
              <span>Costo de envío</span>
              <span>${order.shippingCost.toLocaleString('es-CL')}</span>
            </div>
          </div>
          
          <div className="border-t-2 border-dashed border-gray-300 my-4"></div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Total a Pagar</span>
            <span className="text-3xl font-black text-emerald-600">${order.total.toLocaleString('es-CL')}</span>
          </div>
        </div>
      </div>

      {/* Footer / Legal */}
      <div className="border-t border-gray-200 pt-8 mt-auto text-center">
        <p className="font-black text-lg text-gray-900 mb-2">¡Gracias por preferir {storeName}!</p>
        <p className="text-xs text-gray-500 font-medium max-w-lg mx-auto leading-relaxed">
          Este documento es un comprobante de tu orden y puede no servir de factura tributaria dependiendo de tu región.
          Para cualquier consulta relacionada con esta compra, contáctanos mencionando el Nº de Documento.
        </p>
        <div className="mt-6 flex justify-center border-t border-gray-100 pt-6">
          <div className="text-[10px] text-gray-400 font-black tracking-widest uppercase">
            Documento generado electrónicamente el {new Date().toLocaleDateString('es-CL')}
          </div>
        </div>
      </div>
    </div>
  );
}
