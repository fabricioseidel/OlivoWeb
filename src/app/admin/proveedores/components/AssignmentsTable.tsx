"use client";

import { type Product } from "@/contexts/ProductContext";
import { type Assignment, type EditFormState } from "../lib";

interface AssignmentsTableProps {
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

export default function AssignmentsTable({
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
}: AssignmentsTableProps) {
  return (
    <div className="hidden md:block overflow-auto ring-1 ring-gray-200 rounded-xl">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-gray-500">
              Producto
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">
              Sin IVA
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">
              Con IVA
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">
              Cant. sugerida
            </th>
            <th className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest text-gray-500">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-100 text-sm">
          {filteredAssignments.map((assignment) => {
            const product = products.find(
              (p) => p.id === assignment.product_id
            );
            const cost = assignment.unit_cost || 0;
            const qty = assignment.default_reorder_qty ?? 0;
            const isEditing =
              editingProductId === assignment.product_id;
            return (
              <tr
                key={`${assignment.product_id}-${assignment.supplier_id}`}
                className={isEditing ? "bg-emerald-50/50" : ""}
              >
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    {product?.name ?? assignment.product_id}
                  </div>
                  {!isEditing && assignment.notes ? (
                    <div className="text-xs text-gray-500">
                      {assignment.notes}
                    </div>
                  ) : null}
                </td>
                {isEditing ? (
                  <>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium text-right focus:ring-2 focus:ring-emerald-500"
                        value={editForm.priceWithoutVat}
                        onChange={(e) =>
                          handleEditPriceChange(
                            "without",
                            e.target.value
                          )
                        }
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="w-24 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium text-right focus:ring-2 focus:ring-emerald-500"
                        value={editForm.priceWithVat}
                        onChange={(e) =>
                          handleEditPriceChange("with", e.target.value)
                        }
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        className="w-20 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-sm font-medium text-right focus:ring-2 focus:ring-emerald-500"
                        value={editForm.defaultReorderQty}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            defaultReorderQty: e.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={cancelEditAssignment}
                          disabled={assignmentSaving}
                          className="px-3 py-1.5 ring-1 ring-gray-200 text-gray-700 bg-white rounded-lg text-xs font-bold hover:bg-gray-50 transition min-h-[36px]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            saveEditAssignment(assignment.product_id)
                          }
                          disabled={assignmentSaving}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition min-h-[36px]"
                        >
                          {assignmentSaving ? "..." : "Guardar"}
                        </button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td
                      className={`px-4 py-3 text-right ${
                        cost > 0 ? "" : "text-rose-600 font-semibold"
                      }`}
                    >
                      ${cost.toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${
                        cost > 0 ? "text-emerald-700" : "text-rose-600"
                      }`}
                    >
                      ${(cost * 1.19).toFixed(2)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right ${
                        qty > 0 ? "" : "text-rose-600 font-semibold"
                      }`}
                    >
                      {qty > 0 ? qty : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            startEditAssignment(assignment)
                          }
                          disabled={assignmentSaving}
                          className="px-3 py-1.5 ring-1 ring-sky-200 text-sky-700 bg-white rounded-lg text-xs font-bold hover:bg-sky-50 transition min-h-[36px]"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteAssignment(
                              assignment.product_id
                            )
                          }
                          disabled={assignmentSaving}
                          className="px-3 py-1.5 ring-1 ring-rose-200 text-rose-700 bg-white rounded-lg text-xs font-bold hover:bg-rose-50 transition min-h-[36px]"
                        >
                          Quitar
                        </button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
          {assignments.length > 0 && filteredAssignments.length === 0 && (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-sm text-gray-500"
              >
                Ningún producto coincide con &quot;{assignmentSearch}&quot;.
              </td>
            </tr>
          )}
          {!assignments.length && (
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-sm text-gray-500"
              >
                No hay productos asignados a este proveedor.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
