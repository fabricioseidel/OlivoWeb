"use client";

import { type ProductChanges } from "../lib";
import EditableRow from "./EditableRow";

interface ProductTableProps {
  visibleProducts: any[];
  editedChanges: Record<string, ProductChanges>;
  onChange: (productId: string, field: keyof ProductChanges, value: string | string[]) => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  allVisibleSelected: boolean;
  onToggleAllVisible: () => void;
  onRevert: (productId: string) => void;
  onPasteColumn: (productId: string, field: keyof ProductChanges, values: string[]) => void;
}

const TH = "py-3 text-[11px] font-black uppercase tracking-wider text-gray-500";

export default function ProductTable({
  visibleProducts,
  editedChanges,
  onChange,
  selectedIds,
  onToggleSelect,
  allVisibleSelected,
  onToggleAllVisible,
  onRevert,
  onPasteColumn,
}: ProductTableProps) {
  return (
    // `overflow-hidden` en el contenedor exterior recorta las esquinas
    // redondeadas; el scroll horizontal va en un div propio adentro.
    //
    // `table-fixed` con anchos explícitos: cada columna numérica tiene el
    // ancho justo para un precio CLP de 5-6 cifras y el nombre se queda con el
    // resto. Antes los anchos los decidía el navegador según el contenido de
    // los inputs, y la tabla se pasaba del contenedor: "Ópt." quedaba cortada
    // y los precios se veían a medias.
    <div className="hidden lg:block bg-white rounded-[2rem] shadow-xl shadow-gray-200/40 border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto" data-grid-scope="table">
        <table className="w-full min-w-[1040px] table-fixed text-left border-collapse">
          <colgroup>
            <col className="w-10" />
            <col />
            <col className="w-[92px]" />
            <col className="w-40" />
            <col className="w-[104px]" />
            <col className="w-[104px]" />
            <col className="w-[104px]" />
            <col className="w-20" />
            <col className="w-[68px]" />
            <col className="w-[84px]" />
          </colgroup>
          <thead>
            <tr className="bg-gray-50/70 border-b border-gray-100">
              <th className="pl-4 pr-1 py-3">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={onToggleAllVisible}
                  aria-label="Seleccionar todos los visibles"
                  title="Seleccionar / quitar todos los visibles"
                  className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
              </th>
              <th className={`${TH} px-3`}>Producto / SKU</th>
              <th className={`${TH} px-2 text-center`}>Vitrina</th>
              <th className={`${TH} px-2`}>Categorías</th>
              <th className={`${TH} px-1.5 text-right`}>Costo</th>
              <th className={`${TH} px-1.5 text-right`}>Precio</th>
              <th className={`${TH} px-1.5 text-right`}>Oferta</th>
              <th className={`${TH} px-1.5 text-right`}>Stock</th>
              <th className={`${TH} px-1.5 text-right`} title="Stock mínimo">Mín.</th>
              <th className={`${TH} pl-1.5 pr-4 text-right`} title="Stock óptimo">Ópt.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visibleProducts.map((product, index) => (
              <EditableRow
                key={product.id}
                product={product}
                changes={editedChanges[product.id]}
                rowIndex={index}
                selected={selectedIds.has(product.id)}
                onToggleSelect={onToggleSelect}
                onChange={onChange}
                onRevert={onRevert}
                onPasteColumn={onPasteColumn}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
