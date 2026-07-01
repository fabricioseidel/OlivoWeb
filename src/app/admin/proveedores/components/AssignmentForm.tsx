"use client";

import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import Button from "@/components/ui/Button";
import { type Product } from "@/contexts/ProductContext";
import Field from "./Field";
import { type AssignmentFormState } from "../lib";

interface AssignmentFormProps {
  assignmentForm: AssignmentFormState;
  assignmentSaving: boolean;
  productPickerRef: React.RefObject<HTMLDivElement | null>;
  productPickerOpen: boolean;
  productPickerSearch: string;
  setProductPickerOpen: (open: boolean) => void;
  setProductPickerSearch: (value: string) => void;
  pickerResults: Product[];
  selectedProductObj: Product | null;
  selectProduct: (p: Product) => void;
  clearSelectedProduct: () => void;
  onSubmit: (e: React.FormEvent) => void;
  handlePriceCalculation: (field: "with" | "without", value: string) => void;
  handleAssignmentChange: (field: string, value: string) => void;
}

export default function AssignmentForm({
  assignmentForm,
  assignmentSaving,
  productPickerRef,
  productPickerOpen,
  productPickerSearch,
  setProductPickerOpen,
  setProductPickerSearch,
  pickerResults,
  selectedProductObj,
  selectProduct,
  clearSelectedProduct,
  onSubmit,
  handlePriceCalculation,
  handleAssignmentChange,
}: AssignmentFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 md:grid-cols-6 bg-gray-50 rounded-xl p-4 ring-1 ring-dashed ring-gray-200"
    >
      <div className="md:col-span-2">
        <Field label="Producto" required>
          <div ref={productPickerRef} className="relative">
            {selectedProductObj ? (
              <div className="flex items-center justify-between bg-emerald-50 ring-1 ring-emerald-200 rounded-xl px-3 py-2.5 gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-bold text-gray-900 truncate">
                    {selectedProductObj.name}
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono truncate">
                    Stock: {selectedProductObj.stock} ·{" "}
                    {selectedProductObj.barcode ||
                      selectedProductObj.id.slice(0, 8)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearSelectedProduct}
                  className="p-1.5 rounded-lg text-gray-500 hover:bg-emerald-100 hover:text-gray-900 shrink-0 min-h-[32px] min-w-[32px] inline-flex items-center justify-center"
                  title="Quitar selección"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={productPickerSearch}
                    onChange={(e) => {
                      setProductPickerSearch(e.target.value);
                      setProductPickerOpen(true);
                    }}
                    onFocus={() => setProductPickerOpen(true)}
                    placeholder="Buscar producto por nombre o código…"
                    className="w-full bg-white border-none rounded-xl pl-9 pr-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                {productPickerOpen && (
                  <div className="absolute z-30 mt-1 w-full bg-white ring-1 ring-gray-200 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                    {pickerResults.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-gray-500">
                        {productPickerSearch
                          ? `Sin resultados para "${productPickerSearch}"`
                          : "Todos los productos ya están asignados a este proveedor"}
                      </div>
                    ) : (
                      <>
                        {pickerResults.slice(0, 100).map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => selectProduct(p)}
                            className="w-full text-left px-3 py-2.5 hover:bg-emerald-50 flex items-center justify-between gap-2 border-b border-gray-100 last:border-0 min-h-[44px]"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {p.name}
                              </div>
                              <div className="text-[10px] text-gray-500 font-mono truncate">
                                {p.barcode || p.id.slice(0, 8)}
                                {p.purchasePrice
                                  ? ` · Costo sugerido: $${p.purchasePrice.toLocaleString("es-CL")}`
                                  : ""}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ring-1 ${
                                p.stock > 10
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  : p.stock > 0
                                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                                  : "bg-rose-50 text-rose-700 ring-rose-200"
                              }`}
                            >
                              {p.stock}
                            </span>
                          </button>
                        ))}
                        {pickerResults.length > 100 && (
                          <div className="px-3 py-2 text-[10px] text-gray-400 italic text-center bg-gray-50 border-t border-gray-100">
                            Mostrando 100 de {pickerResults.length}.
                            Refiná tu búsqueda.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </Field>
      </div>

      <Field label="Costo con IVA">
        <input
          type="number"
          step="0.01"
          className="w-full bg-white border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
          value={assignmentForm.priceWithVat}
          onChange={(e) => handlePriceCalculation("with", e.target.value)}
          placeholder="0.00"
        />
      </Field>

      <Field label="Costo sin IVA">
        <input
          type="number"
          step="0.01"
          className="w-full bg-white border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
          value={assignmentForm.priceWithoutVat}
          onChange={(e) =>
            handlePriceCalculation("without", e.target.value)
          }
          placeholder="0.00"
        />
      </Field>

      <Field label="Cant. sugerida">
        <input
          type="number"
          min={0}
          className="w-full bg-white border-none rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
          value={assignmentForm.defaultReorderQty}
          onChange={(e) =>
            handleAssignmentChange("defaultReorderQty", e.target.value)
          }
        />
      </Field>

      <div className="md:col-span-6 flex items-center justify-end">
        <Button type="submit" disabled={assignmentSaving}>
          {assignmentSaving ? "Guardando..." : "Asignar producto"}
        </Button>
      </div>
    </form>
  );
}
