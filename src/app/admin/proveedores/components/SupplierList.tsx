"use client";

import { TruckIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/admin/shell";
import { type Supplier } from "../lib";

interface SupplierListProps {
  search: string;
  onSearchChange: (value: string) => void;
  onNewSupplier: () => void;
  filteredSuppliers: Supplier[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}

export default function SupplierList({
  search,
  onSearchChange,
  onNewSupplier,
  filteredSuppliers,
  selectedId,
  onSelect,
  loading,
}: SupplierListProps) {
  return (
    <aside className="lg:col-span-1 bg-white ring-1 ring-gray-200 rounded-2xl shadow-sm p-4 space-y-3">
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar proveedor..."
          className="w-full bg-gray-50 border-none rounded-xl pl-9 pr-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-emerald-500"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={onNewSupplier}
        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-emerald-100 transition-all min-h-[40px]"
      >
        <PlusIcon className="size-4" />
        Nuevo proveedor
      </button>

      <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto -mx-1 px-1">
        {filteredSuppliers.map((supplier) => (
          <button
            key={supplier.id}
            type="button"
            onClick={() => onSelect(supplier.id)}
            className={`w-full text-left px-3 py-3 rounded-lg transition min-h-[44px] ${
              supplier.id === selectedId
                ? "bg-emerald-50 ring-1 ring-emerald-200"
                : "hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-gray-800 truncate">
                {supplier.name}
              </span>
              {supplier.productCount ? (
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {supplier.productCount}
                </span>
              ) : null}
            </div>
            {supplier.contact_name ? (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {supplier.contact_name}
              </p>
            ) : null}
            {(supplier.whatsapp || supplier.phone) && (
              <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                WhatsApp: {supplier.whatsapp || supplier.phone}
              </p>
            )}
          </button>
        ))}
        {!filteredSuppliers.length && !loading && (
          <EmptyState
            icon={<TruckIcon className="h-5 w-5" />}
            title="Sin proveedores"
            description="No se encontraron proveedores."
          />
        )}
      </div>
    </aside>
  );
}
