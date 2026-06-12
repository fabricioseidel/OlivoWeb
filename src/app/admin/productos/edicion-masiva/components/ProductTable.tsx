"use client";

import { type ProductChanges } from "../lib";
import EditableRow from "./EditableRow";

interface ProductTableProps {
  visibleProducts: any[];
  editedChanges: Record<string, ProductChanges>;
  onChange: (productId: string, field: keyof ProductChanges, value: string | string[]) => void;
}

export default function ProductTable({ visibleProducts, editedChanges, onChange }: ProductTableProps) {
  return (
    <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50/50 border-b border-gray-100">
            <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">Producto / SKU</th>
            <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-48">Categorías</th>
            <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-28 text-right">Precio ($)</th>
            <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-28 text-right">Oferta ($)</th>
            <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-24 text-right">Stock</th>
            <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-20 text-right">Mín.</th>
            <th className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 w-20 text-right">Ópt.</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {visibleProducts.map((product) => (
            <EditableRow key={product.id} product={product} changes={editedChanges[product.id]} onChange={onChange} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
