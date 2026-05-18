"use client";

import Link from "next/link";
import { CheckCircleIcon, ShoppingCartIcon } from "@heroicons/react/24/outline";

type SupplierSummary = {
  id: string;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
};

type ProductSupplier = {
  id: string;
  supplierId: string;
  productId: string;
  priority: number;
  supplierSku?: string | null;
  defaultReorderQty?: number | null;
  reorderThreshold?: number | null;
  deficit: number;
  suggestedQty: number;
  supplier: SupplierSummary;
};

export type ReplenishmentProduct = {
  productId: string;
  name: string;
  stock: number;
  threshold: number;
  deficit: number;
  salePrice?: number | null;
  imageUrl?: string | null;
  suppliers: ProductSupplier[];
};

export type ReplenishmentResponse = {
  generatedAt: string;
  totalProducts: number;
  lowStockCount: number;
  items: ReplenishmentProduct[];
};

type SupplierGroupItem = {
  product: ReplenishmentProduct;
  assignment: ProductSupplier;
};

type SupplierGroup = {
  supplier: SupplierSummary;
  lowProducts: SupplierGroupItem[];
};

function buildSupplierGroups(items: ReplenishmentProduct[]): SupplierGroup[] {
  const map = new Map<string, SupplierGroup>();
  items.forEach((product) => {
    product.suppliers.forEach((assignment) => {
      const sid = assignment.supplier.id;
      if (!map.has(sid)) {
        map.set(sid, { supplier: assignment.supplier, lowProducts: [] });
      }
      map.get(sid)!.lowProducts.push({ product, assignment });
    });
  });
  return Array.from(map.values()).sort(
    (a, b) => b.lowProducts.length - a.lowProducts.length
  );
}

type Props = {
  data: ReplenishmentResponse | null;
  loading: boolean;
  onGoToSuggestions?: () => void;
};

export default function StockBajoPanel({
  data,
  loading,
  onGoToSuggestions,
}: Props) {
  const supplierGroups = buildSupplierGroups(data?.items ?? []);

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onGoToSuggestions}
        className="block w-full text-left bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-2xl p-4 sm:p-5 shadow-md transition-colors"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200 mb-1">
              Reposición semi-automática
            </div>
            <div className="text-base sm:text-lg font-bold leading-tight">
              Calcular sugerencias con velocidad de venta y generar borradores
            </div>
            <div className="text-xs text-emerald-100/80 mt-1">
              Usa ventas POS + web de los últimos 30 días para proyectar.
            </div>
          </div>
          <div className="shrink-0 text-2xl">→</div>
        </div>
      </button>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500" />
        </div>
      ) : supplierGroups.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <CheckCircleIcon className="h-12 w-12 text-emerald-400 mx-auto mb-3" />
          <p className="font-semibold text-emerald-800">¡Stock al día!</p>
          <p className="text-sm text-emerald-600 mt-1">
            No hay productos por debajo del umbral de reposición.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {supplierGroups.map((group) => (
            <SupplierStockCard key={group.supplier.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function SupplierStockCard({ group }: { group: SupplierGroup }) {
  const sorted = [...group.lowProducts].sort(
    (a, b) => a.product.stock - b.product.stock
  );
  const topProducts = sorted.slice(0, 4);
  const remaining = sorted.length - topProducts.length;

  return (
    <div className="bg-white ring-1 ring-gray-200 rounded-2xl p-4 space-y-3 hover:shadow-sm transition">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {group.supplier.name}
          </h3>
          <p className="text-[10px] text-gray-500 mt-0.5">
            {group.supplier.contact_name && `${group.supplier.contact_name} • `}
            {group.supplier.whatsapp || group.supplier.phone || "Sin teléfono"}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold bg-red-100 text-red-700 px-2.5 py-1 rounded-full">
          {group.lowProducts.length} bajos
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {topProducts.map(({ product }) => {
          const isZero = product.stock === 0;
          return (
            <span
              key={product.productId}
              className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
                isZero
                  ? "bg-red-50 border-red-200 text-red-700"
                  : "bg-yellow-50 border-yellow-200 text-yellow-700"
              }`}
            >
              <span className="font-medium truncate max-w-[140px]">
                {product.name}
              </span>
              <span className="font-black">
                {product.stock}/{product.threshold}
              </span>
            </span>
          );
        })}
        {remaining > 0 && (
          <span className="text-[10px] text-gray-400 self-center">
            +{remaining} más
          </span>
        )}
      </div>

      <Link
        href={`/admin/pedidos-proveedor/nuevo?supplierId=${group.supplier.id}`}
      >
        <button className="w-full mt-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition active:scale-[0.98]">
          <ShoppingCartIcon className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Crear Pedido
        </button>
      </Link>
    </div>
  );
}
