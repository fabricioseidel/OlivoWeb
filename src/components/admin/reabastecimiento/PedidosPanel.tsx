"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ShoppingCartIcon,
} from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { StatusBadge, EmptyState } from "@/components/admin/shell";

export interface SupplierOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  expectedDate?: string;
  deliveredDate?: string;
  status:
    | "borrador"
    | "pendiente"
    | "confirmado"
    | "enviado_por_whatsapp"
    | "gestionado"
    | "recibido"
    | "cancelado";
  paymentStatus: "pendiente" | "parcial" | "pagado";
  total: number;
  itemCount: number;
  notes?: string;
}

type Props = {
  orders: SupplierOrder[];
  loading: boolean;
  onCreateFromSuggestions?: () => void;
};

const STATUS_FILTER_OPTIONS = [
  { value: "todos", label: "Todos" },
  { value: "borrador", label: "Borrador" },
  { value: "pendiente", label: "Pendiente" },
  { value: "confirmado", label: "Confirmado" },
  { value: "enviado_por_whatsapp", label: "WhatsApp" },
  { value: "gestionado", label: "Gestionado" },
  { value: "recibido", label: "Recibido" },
  { value: "cancelado", label: "Cancelado" },
];

const paymentBadgeClasses: Record<string, string> = {
  pendiente: "bg-rose-100 text-rose-800 ring-rose-200",
  parcial: "bg-amber-100 text-amber-800 ring-amber-200",
  pagado: "bg-emerald-100 text-emerald-800 ring-emerald-200",
};
const paymentLabel: Record<string, string> = {
  pendiente: "Sin pagar",
  parcial: "Parcial",
  pagado: "Pagado",
};

export default function PedidosPanel({
  orders,
  loading,
  onCreateFromSuggestions,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  const filteredOrders = useMemo(() => {
    let filtered = orders;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.supplierName.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "todos") {
      filtered = filtered.filter((o) => o.status === statusFilter);
    }
    return filtered.sort(
      (a, b) =>
        new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
  }, [orders, search, statusFilter]);

  return (
    <div className="space-y-4">
      <Button
        onClick={onCreateFromSuggestions}
        className="w-full py-3 text-sm"
        variant="primary"
      >
        <PlusIcon className="h-5 w-5 mr-2" />
        Calcular sugerencias para crear pedidos
      </Button>

      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCartIcon className="h-7 w-7" />}
          title="No se encontraron pedidos"
          description="Probá ajustar los filtros o crear uno nuevo desde sugerencias."
        />
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/pedidos-proveedor/${order.id}`}
              className="block"
            >
              <div className="bg-white rounded-2xl ring-1 ring-gray-200 hover:ring-emerald-300 hover:shadow-md transition-all p-4 space-y-2 active:scale-[0.99]">
                <div className="flex justify-between items-start gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {order.supplierName}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      #{order.id.slice(0, 8)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-base font-black text-emerald-600">
                      ${order.total.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {order.itemCount} prod.
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex gap-1.5">
                    <StatusBadge status={order.status} size="sm" />
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide rounded-full ring-1 ${
                        paymentBadgeClasses[order.paymentStatus] ||
                        "bg-gray-100 text-gray-700 ring-gray-200"
                      }`}
                    >
                      {paymentLabel[order.paymentStatus] || order.paymentStatus}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
