"use client";

import { memo, useRef } from "react";
import {
  ArrowUturnLeftIcon,
  CheckBadgeIcon,
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { compressImageFile } from "@/utils/image";
import { getPriceWarnings, getProductDiagnostics, type ProductChanges } from "../lib";
import CategorySelector from "./CategorySelector";
import NumberCell from "./NumberCell";

interface EditableRowProps {
  product: any;
  changes?: ProductChanges;
  rowIndex: number;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onChange: (productId: string, field: keyof ProductChanges, value: any) => void;
  onRevert: (productId: string) => void;
  onPasteColumn: (productId: string, field: keyof ProductChanges, values: string[]) => void;
}

const CELL = "h-9 text-sm rounded-lg border-2 px-2";
const IDLE = "bg-white border-transparent text-gray-900 hover:border-gray-200 shadow-sm focus:ring-brand-500/10";
const EDITED = "bg-white border-brand-500 text-brand-700 focus:ring-brand-500/10";

const EditableRow = memo(function EditableRow({
  product,
  changes,
  rowIndex,
  selected,
  onToggleSelect,
  onChange,
  onRevert,
  onPasteColumn,
}: EditableRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDirty = Object.keys(changes || {}).length > 0;
  const diag = getProductDiagnostics(product, changes);
  const warnings = getPriceWarnings(product, changes);

  const displayImage = changes?.image !== undefined ? changes.image : product.image;
  const hasImage = Boolean(displayImage && displayImage !== "/file.svg");
  const isNewImage = changes?.image !== undefined;

  const name = changes?.name ?? product.name;
  const offerPrice = changes?.offerPrice !== undefined ? changes.offerPrice : product.offerPrice || null;
  const purchasePrice = changes?.purchasePrice ?? product.purchasePrice;
  const stock = Number(changes?.stock ?? product.stock ?? 0);
  const cats = changes?.categories ?? product.categories ?? [];
  const isActive = (changes?.isActive !== undefined ? changes.isActive : product.isActive) !== false;

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFile(file);
      onChange(product.id, "image", dataUrl);
    } catch (err) {
      console.error("Error al procesar imagen:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const paste = (field: keyof ProductChanges) => (values: string[]) => onPasteColumn(product.id, field, values);

  return (
    <tr
      className={`transition-colors group ${
        selected ? "bg-brand-50" : isDirty ? "bg-brand-50/40" : "hover:bg-gray-50/60"
      }`}
    >
      <td className="pl-4 pr-1 py-2.5 align-middle">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelect(product.id)}
          aria-label={`Seleccionar ${name}`}
          className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
        />
      </td>

      {/* Producto / SKU / diagnóstico */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 group/thumb">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayImage}
                alt=""
                className="w-11 h-11 rounded-xl object-contain shadow-sm bg-white border border-gray-100 p-0.5"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-sm">
                📦
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              aria-label={hasImage ? `Cambiar foto de ${name}` : `Subir foto de ${name}`}
              title={hasImage ? "Cambiar foto" : "Subir foto"}
              className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover/thumb:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
            >
              <CameraIcon className="w-4 h-4" />
            </button>

            {isNewImage && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-500 border-2 border-white rounded-full" title="Foto nueva lista para guardar" />
            )}

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {diag.isReady && (
                <CheckBadgeIcon className="w-4 h-4 text-emerald-500 shrink-0" title="Listo para vitrina" />
              )}
              <input
                type="text"
                value={name}
                title={name}
                aria-label="Nombre"
                onChange={(e) => onChange(product.id, "name", e.target.value)}
                className={`w-full text-sm font-bold leading-tight px-1 py-0.5 bg-transparent border-b-2 transition-all focus:outline-none focus:border-brand-500 truncate ${
                  changes?.name !== undefined ? "border-brand-500 text-brand-700" : "border-transparent text-gray-800 hover:border-gray-300"
                }`}
              />
              {isDirty && (
                <button
                  type="button"
                  onClick={() => onRevert(product.id)}
                  title="Deshacer los cambios de este producto"
                  aria-label={`Deshacer cambios de ${name}`}
                  className="shrink-0 p-1 rounded-lg text-brand-600 hover:bg-brand-100 transition-colors"
                >
                  <ArrowUturnLeftIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-1 mt-1">
              <input
                type="text"
                aria-label="Código de barras"
                title="Código de barras — cambiarlo renombra el identificador del producto (se confirma al guardar)"
                value={changes?.barcode ?? product.barcode ?? ""}
                onChange={(e) => onChange(product.id, "barcode", e.target.value)}
                placeholder="Sin SKU"
                className={`w-32 text-[11px] font-mono font-semibold bg-transparent border-b transition-all focus:outline-none focus:border-violet-500 ${
                  changes?.barcode !== undefined
                    ? "border-violet-500 text-violet-700"
                    : product.barcode
                    ? "border-transparent text-gray-500 hover:border-gray-300"
                    : "border-transparent text-rose-500 hover:border-gray-300"
                }`}
              />

              {diag.missingData.map((m) =>
                m === "Sin foto" ? (
                  <button
                    key={m}
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                  >
                    📷 Subir foto
                  </button>
                ) : (
                  <span key={m} className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {m}
                  </span>
                )
              )}
              {!diag.hasCost && (
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  Sin costo
                </span>
              )}
              {warnings.map((w) => (
                <span key={w} className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white">
                  ⚠ {w}
                </span>
              ))}
            </div>
          </div>
        </div>
      </td>

      {/* Vitrina (activo / oculto) */}
      <td className="px-2 py-2.5 text-center">
        <button
          type="button"
          onClick={() => onChange(product.id, "isActive", !isActive)}
          aria-pressed={isActive}
          title={isActive ? "Activo en la tienda (clic para ocultar)" : "Oculto en la tienda (clic para activar)"}
          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide transition-colors border ${
            changes?.isActive !== undefined ? "ring-2 ring-brand-400 " : ""
          }${
            isActive
              ? "bg-brand-100 text-brand-700 hover:bg-brand-200 border-brand-200"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 border-gray-200"
          }`}
        >
          {isActive ? (
            <>
              <EyeIcon className="w-3 h-3" /> Vitrina
            </>
          ) : (
            <>
              <EyeSlashIcon className="w-3 h-3" /> Oculto
            </>
          )}
        </button>
      </td>

      <td className="px-2 py-2.5">
        <CategorySelector
          value={cats}
          isDirty={changes?.categories !== undefined}
          onChange={(next) => onChange(product.id, "categories", next)}
        />
      </td>

      <td className="px-1.5 py-2.5">
        <NumberCell
          value={purchasePrice}
          field="purchasePrice"
          rowIndex={rowIndex}
          allowEmpty
          prefix="$"
          placeholder="0"
          label={`Costo de ${name}`}
          onCommit={(t) => onChange(product.id, "purchasePrice", t)}
          onPasteColumn={paste("purchasePrice")}
          sizeClass={CELL}
          stateClass={
            changes?.purchasePrice !== undefined
              ? "bg-white border-indigo-500 text-indigo-700 focus:ring-indigo-500/10"
              : IDLE
          }
        />
      </td>
      <td className="px-1.5 py-2.5">
        <NumberCell
          value={changes?.price ?? product.price}
          field="price"
          rowIndex={rowIndex}
          prefix="$"
          label={`Precio de ${name}`}
          onCommit={(t) => onChange(product.id, "price", t)}
          onPasteColumn={paste("price")}
          sizeClass={CELL}
          stateClass={
            warnings.length > 0
              ? "bg-rose-50 border-rose-400 text-rose-700 focus:ring-rose-500/10"
              : changes?.price !== undefined
              ? EDITED
              : IDLE
          }
        />
      </td>
      <td className="px-1.5 py-2.5">
        <NumberCell
          value={offerPrice}
          field="offerPrice"
          rowIndex={rowIndex}
          allowEmpty
          prefix="$"
          placeholder="—"
          title="Vacío = sin oferta"
          label={`Oferta de ${name}`}
          onCommit={(t) => onChange(product.id, "offerPrice", t)}
          onPasteColumn={paste("offerPrice")}
          sizeClass={CELL}
          stateClass={
            changes?.offerPrice !== undefined
              ? "bg-white border-amber-400 text-amber-700 focus:ring-amber-500/10"
              : "bg-gray-50/60 border-transparent text-gray-900 hover:border-gray-200 shadow-sm focus:ring-amber-500/10"
          }
        />
      </td>
      <td className="px-1.5 py-2.5">
        <NumberCell
          value={changes?.stock ?? product.stock}
          field="stock"
          rowIndex={rowIndex}
          integer
          label={`Stock de ${name}`}
          title={stock <= 0 ? "Sin stock" : stock <= 5 ? "Stock bajo" : undefined}
          onCommit={(t) => onChange(product.id, "stock", t)}
          onPasteColumn={paste("stock")}
          sizeClass={CELL}
          stateClass={
            changes?.stock !== undefined
              ? EDITED
              : stock <= 0
              ? "bg-rose-50 border-transparent text-rose-600 hover:border-rose-200 focus:ring-rose-500/10"
              : stock <= 5
              ? "bg-amber-50 border-transparent text-amber-700 hover:border-amber-200 focus:ring-amber-500/10"
              : IDLE
          }
        />
      </td>
      <td className="px-1.5 py-2.5">
        <NumberCell
          value={changes?.minStock ?? product.minStock}
          field="minStock"
          rowIndex={rowIndex}
          integer
          label={`Stock mínimo de ${name}`}
          onCommit={(t) => onChange(product.id, "minStock", t)}
          onPasteColumn={paste("minStock")}
          sizeClass={CELL}
          stateClass={changes?.minStock !== undefined ? EDITED : IDLE}
        />
      </td>
      <td className="pl-1.5 pr-4 py-2.5">
        <NumberCell
          value={changes?.optimumStock ?? product.optimumStock}
          field="optimumStock"
          rowIndex={rowIndex}
          integer
          label={`Stock óptimo de ${name}`}
          onCommit={(t) => onChange(product.id, "optimumStock", t)}
          onPasteColumn={paste("optimumStock")}
          sizeClass={CELL}
          stateClass={changes?.optimumStock !== undefined ? EDITED : IDLE}
        />
      </td>
    </tr>
  );
});

export default EditableRow;
