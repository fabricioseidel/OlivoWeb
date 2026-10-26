"use client";

interface SelectionToolbarProps {
  visibleProductsCount: number;
  selectedCount: number;
  onSelectAllVisible: () => void;
  onClearSelection: () => void;
}

export default function SelectionToolbar({
  visibleProductsCount,
  selectedCount,
  onSelectAllVisible,
  onClearSelection,
}: SelectionToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <button
        onClick={onSelectAllVisible}
        className="px-4 h-9 rounded-xl bg-white border-2 border-gray-100 hover:border-brand-300 text-[11px] font-black uppercase tracking-wider text-gray-600 transition-colors"
      >
        Seleccionar visibles ({visibleProductsCount})
      </button>
      {selectedCount > 0 && (
        <>
          <span className="px-3 h-9 inline-flex items-center rounded-xl bg-brand-100 text-brand-700 text-[11px] font-black uppercase tracking-wider">
            {selectedCount} seleccionados
          </span>
          <button
            onClick={onClearSelection}
            className="px-3 h-9 rounded-xl text-[11px] font-black uppercase tracking-wider text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            Limpiar
          </button>
          <span className="text-xs font-medium text-gray-600">
            Las acciones masivas se aplicarán solo a la selección
          </span>
        </>
      )}
    </div>
  );
}
