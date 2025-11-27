"use client";

import Link from "next/link";

export default function MisPedidosPage() {
  const pedidos = [
    { id: "ORD-5421", fecha: "2025-08-09", total: 890.58, estado: "Completado" },
    { id: "ORD-5422", fecha: "2025-08-08", total: 129.99, estado: "En proceso" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Mis pedidos</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pedido</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {pedidos.map(p => (
              <tr key={p.id}>
                <td className="px-6 py-4">{p.id}</td>
                <td className="px-6 py-4">{p.fecha}</td>
                <td className="px-6 py-4">$ {p.total.toFixed(2)}</td>
                <td className="px-6 py-4 text-right">
                  <Link href={`/mi-cuenta/pedidos/${p.id}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    Ver detalle →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
