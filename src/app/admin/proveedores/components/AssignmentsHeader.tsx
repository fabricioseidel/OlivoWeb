"use client";

interface AssignmentsHeaderProps {
  assignmentsCount: number;
  assignmentStats: {
    total: number;
    withCost: number;
    withoutCost: number;
    withQty: number;
  };
}

export default function AssignmentsHeader({
  assignmentsCount,
  assignmentStats,
}: AssignmentsHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <h3 className="text-lg font-bold text-gray-900">
          Productos asignados
        </h3>
        <p className="text-sm text-gray-500">
          Editá costo y cantidad sugerida inline para cada producto.
        </p>
      </div>
      {assignmentsCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-[10px] font-black uppercase tracking-widest">
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full ring-1 ring-emerald-200">
            {assignmentStats.withCost} con costo
          </span>
          {assignmentStats.withoutCost > 0 && (
            <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded-full ring-1 ring-amber-200">
              {assignmentStats.withoutCost} sin costo
            </span>
          )}
          <span className="px-2 py-1 bg-sky-50 text-sky-700 rounded-full ring-1 ring-sky-200">
            {assignmentStats.withQty} con cant.
          </span>
        </div>
      )}
    </div>
  );
}
