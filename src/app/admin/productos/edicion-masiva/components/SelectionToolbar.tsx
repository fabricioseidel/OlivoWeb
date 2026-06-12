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
        className="px-4 h-9 rounded-xl bg-white border-2 border-gray-100 hover:border-emerald-300 text-[10px] font-black uppercase tracking-widest text-gray-500 transition-colors"
      >
        Seleccionar visibles ({visibleProductsCount})
      </button>
      {selectedCount > 0 && (
        <>
          <span className="px-3 h-9 inline-flex items-center rounded-xl bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
            {selectedCount} seleccionados
          </span>
          <button
            onClick={onClearSelection}
            className="px-3 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            Limpiar
          </button>
          <span className="text-[10px] font-bold text-gray-400 italic">
            Las acciones masivas se aplicarán solo a la selección
          </span>
        </>
      )}
    </div>
  );
}
