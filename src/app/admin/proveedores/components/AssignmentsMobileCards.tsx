"use client";

import { CubeIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { EmptyState } from "@/components/admin/shell";
import { type Product } from "@/contexts/ProductContext";
import Field from "./Field";
import { type Assignment, type EditFormState } from "../lib";

interface AssignmentsMobileCardsProps {
  assignments: Assignment[];
  filteredAssignments: Assignment[];
  assignmentSearch: string;
  products: Product[];
  editingProductId: string | null;
  editForm: EditFormState;
  setEditForm: React.Dispatch<React.SetStateAction<EditFormState>>;
  assignmentSaving: boolean;
  handleEditPriceChange: (field: "with" | "without", value: string) => void;
  startEditAssignment: (assignment: Assignment) => void;
  cancelEditAssignment: () => void;
  saveEditAssignment: (productId: string) => void;
  handleDeleteAssignment: (productId: string) => void;
}

export default function AssignmentsMobileCards({
  assignments,
  filteredAssignments,
  assignmentSearch,
  products,
  editingProductId,
  editForm,
  setEditForm,
  assignmentSaving,
  handleEditPriceChange,
  startEditAssignment,
  cancelEditAssignment,
  saveEditAssignment,
  handleDeleteAssignment,
}: AssignmentsMobileCardsProps) {
  return (
    <div className="md:hidden space-y-2">
      {assignments.length === 0 ? (
        <EmptyState
          icon={<CubeIcon className="h-5 w-5" />}
          title="Sin productos asignados"
          description="Asigná productos arriba para automatizar pedidos."
        />
      ) : filteredAssignments.length === 0 ? (
        <EmptyState
          icon={<MagnifyingGlassIcon className="h-5 w-5" />}
          title="Sin coincidencias"
          description={`Ningún producto asignado coincide con "${assignmentSearch}".`}
        />
      ) : (
        filteredAssignments.map((assignment) => {
          const product = products.find(
            (p) => p.id === assignment.product_id
          );
          const cost = assignment.unit_cost || 0;
          const isEditing = editingProductId === assignment.product_id;
          return (
            <div
              key={`${assignment.product_id}-${assignment.supplier_id}`}
              className={`ring-1 rounded-xl p-4 space-y-2 transition-colors ${
                isEditing
                  ? "bg-emerald-50/50 ring-emerald-300"
                  : "bg-gray-50 ring-gray-100"
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {product?.name ?? assignment.product_id}
                  </div>
                  {!isEditing && assignment.notes && (
                    <div className="text-xs text-gray-500 italic mt-0.5">
                      {assignment.notes}
                    </div>
                  )}
                </div>
                {!isEditing && (
                  <div className="text-right shrink-0">
                    <div
                      className={`text-sm font-black ${
                        cost > 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      ${(cost * 1.19).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-400 uppercase font-bold">
                      Con IVA
                    </div>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="grid grid-cols-3 gap-2">
                  <Field label="Con IVA">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-white border-none rounded-lg px-2 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                      value={editForm.priceWithVat}
                      onChange={(e) =>
                        handleEditPriceChange("with", e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Sin IVA">
                    <input
                      type="number"
                      step="0.01"
                      className="w-full bg-white border-none rounded-lg px-2 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                      value={editForm.priceWithoutVat}
                      onChange={(e) =>
                        handleEditPriceChange("without", e.target.value)
                      }
                      placeholder="0.00"
                    />
                  </Field>
                  <Field label="Cant. sug.">
                    <input
                      type="number"
                      min={0}
                      className="w-full bg-white border-none rounded-lg px-2 py-2 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                      value={editForm.defaultReorderQty}
                      onChange={(e) =>
                        setEditForm((prev) => ({
                          ...prev,
                          defaultReorderQty: e.target.value,
                        }))
                      }
                    />
                  </Field>
                </div>
              ) : (
                <div className="flex justify-between items-center text-xs border-t border-gray-200 pt-2 gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-gray-400 font-medium">
                      Sin IVA
                    </span>
                    <span
                      className={`font-bold ${
                        cost > 0 ? "text-gray-700" : "text-rose-600"
                      }`}
                    >
                      ${cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-gray-400 font-medium">
                      Sugerida
                    </span>
                    <span
                      className={`font-bold ${
                        (assignment.default_reorder_qty ?? 0) > 0
                          ? "text-gray-700"
                          : "text-rose-600"
                      }`}
                    >
                      {assignment.default_reorder_qty ?? "—"}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-200">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={cancelEditAssignment}
                      disabled={assignmentSaving}
                      className="flex-1 px-3 py-2 bg-white ring-1 ring-gray-200 text-gray-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-gray-50 transition min-h-[40px]"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        saveEditAssignment(assignment.product_id)
                      }
                      disabled={assignmentSaving}
                      className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition min-h-[40px]"
                    >
                      {assignmentSaving ? "..." : "Guardar"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditAssignment(assignment)}
                      disabled={assignmentSaving}
                      className="flex-1 px-3 py-2 bg-sky-50 ring-1 ring-sky-200 text-sky-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-sky-100 transition min-h-[40px]"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteAssignment(assignment.product_id)
                      }
                      disabled={assignmentSaving}
                      className="flex-1 px-3 py-2 bg-rose-50 ring-1 ring-rose-200 text-rose-700 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-rose-100 transition min-h-[40px]"
                    >
                      Quitar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
