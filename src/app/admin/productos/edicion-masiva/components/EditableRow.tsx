"use client";

import { memo, useRef } from "react";
import { hasRealImage } from "@/services/products";
import {
  CheckBadgeIcon,
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { compressImageFile } from "@/utils/image";
import { getProductDiagnostics, type ProductChanges } from "../lib";
import CategorySelector from "./CategorySelector";

interface EditableRowProps {
  product: any;
  changes?: ProductChanges;
  onChange: (productId: string, field: keyof ProductChanges, value: any) => void;
}

const EditableRow = memo(function EditableRow({
  product,
  changes,
  onChange,
}: EditableRowProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDirty = Object.keys(changes || {}).length > 0;
  const diag = getProductDiagnostics(product, changes);

  const displayImage = changes?.image !== undefined ? changes.image : product.image;
  const hasImage = Boolean(displayImage && displayImage !== "/file.svg");
  const isNewImage = changes?.image !== undefined;

  const price = changes?.price ?? product.price;
  const offerPrice = changes?.offerPrice !== undefined ? changes.offerPrice : product.offerPrice;
  const purchasePrice = changes?.purchasePrice ?? product.purchasePrice;
  const stock = changes?.stock ?? product.stock;
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

  return (
    <tr className={`hover:bg-brand-50/10 transition-colors group ${isDirty ? "bg-brand-50/5" : ""}`}>
      {/* Columna Producto / SKU / Diagnóstico */}
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0 hidden sm:block group/thumb">
            {hasImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayImage}
                alt={product.name}
                className="w-10 h-10 rounded-xl object-contain shadow-sm bg-white border border-gray-100 p-0.5"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                📦
              </div>
            )}

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={hasImage ? "Cambiar foto" : "Subir foto"}
              className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer"
            >
              <CameraIcon className="w-4 h-4" />
            </button>

            {isNewImage && (
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-brand-500 border-2 border-white rounded-full animate-pulse" title="Foto nueva lista para guardar" />
            )}
            {isDirty && !isNewImage && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 border-2 border-white rounded-full" />
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageFile}
            />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {diag.isReady && (
                <CheckBadgeIcon className="w-4 h-4 text-emerald-500 shrink-0" title="Listo para vitrina" />
              )}
              <input
                type="text"
                value={changes?.name ?? product.name}
                onChange={(e) => onChange(product.id, "name", e.target.value)}
                className={`w-full text-sm font-bold leading-tight px-1 py-0.5 bg-transparent border-b-2 transition-all focus:outline-none focus:border-brand-500 ${
                  changes?.name !== undefined ? "border-brand-500 text-brand-700" : "border-transparent text-gray-800 hover:border-gray-300"
                }`}
              />
            </div>

            <div className="flex items-center gap-2 px-1 mt-0.5">
              <input
                type="text"
                title="Código de barras — cambiarlo renombra el identificador del producto"
                value={changes?.barcode ?? product.barcode ?? ""}
                onChange={(e) => onChange(product.id, "barcode", e.target.value)}
                placeholder="Sin SKU"
                className={`w-28 text-[9px] font-black uppercase tracking-tighter bg-transparent border-b transition-all focus:outline-none focus:border-violet-500 ${
                  changes?.barcode !== undefined
                    ? "border-violet-500 text-violet-600"
                    : product.barcode
                    ? "border-transparent text-brand-400 hover:border-gray-300"
                    : "border-transparent text-rose-400 hover:border-gray-300 font-bold"
                }`}
              />

              {/* Pills de diagnóstico rápido */}
              <div className="flex items-center gap-1">
                {diag.missing.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      if (m === "Sin foto") fileInputRef.current?.click();
                    }}
                    className={`px-1 py-0.2 rounded text-[8px] font-black uppercase tracking-tighter ${
                      m === "Sin foto"
                        ? "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                        : "bg-rose-50 text-rose-500 border border-rose-100"
                    }`}
                  >
                    {m === "Sin foto" ? "📷 Foto" : m}
                  </button>
                ))}
                {!diag.hasCost && (
                  <span className="px-1 py-0.2 rounded bg-amber-50 text-amber-600 border border-amber-200 text-[8px] font-black uppercase tracking-tighter">
                    Sin costo
                  </span>
                )}
                {diag.isReady && (
                  <span className="px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[8px] font-black uppercase tracking-tighter">
                    Listo
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </td>

      {/* Columna Vitrina (Activo/Inactivo) */}
      <td className="px-2 py-2.5 text-center w-24">
        <button
          type="button"
          onClick={() => onChange(product.id, "isActive", !isActive)}
          title={isActive ? "Producto activo en vitrina (clic para ocultar)" : "Producto oculto (clic para activar)"}
          className={`inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-colors ${
            isActive
              ? "bg-brand-100 text-brand-700 hover:bg-brand-200 border border-brand-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200 border border-gray-200"
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

      {/* Columna Categorías */}
      <td className="px-3 py-2.5">
        <CategorySelector
          value={cats}
          isDirty={changes?.categories !== undefined}
          onChange={(next) => onChange(product.id, "categories", next)}
        />
      </td>

      {/* Columna Costo de compra ($) */}
      <td className="px-2 py-2.5 text-right w-24">
        <div className="inline-flex items-center relative w-full justify-end">
          <span className="absolute left-2 text-xs font-bold text-indigo-400 pointer-events-none">$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={purchasePrice !== undefined && purchasePrice !== null ? purchasePrice : ""}
            onChange={(e) => onChange(product.id, "purchasePrice", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 pl-5 focus:ring-4 focus:ring-indigo-500/10 transition-all ${
              changes?.purchasePrice !== undefined
                ? "border-indigo-500 text-indigo-700"
                : "border-transparent text-gray-900 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
      <td className="px-3 py-2.5 text-right w-28">
        <div className="inline-flex items-center relative w-full justify-end">
          <span className="absolute left-2 text-xs font-bold text-gray-400 pointer-events-none">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={changes?.price ?? product.price}
            onChange={(e) => onChange(product.id, "price", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 pl-5 focus:ring-4 focus:ring-brand-500/10 transition-all ${
              changes?.price !== undefined ? "border-brand-500 text-brand-700" : "border-transparent text-gray-900 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
      <td className="px-3 py-2.5 text-right w-28">
        <div className="inline-flex items-center relative w-full justify-end">
          <span className="absolute left-2 text-xs font-bold text-gray-400 pointer-events-none">$</span>
          <input
            type="number"
            inputMode="decimal"
            placeholder="-"
            value={changes?.offerPrice !== undefined ? changes.offerPrice ?? "" : product.offerPrice || ""}
            onChange={(e) => onChange(product.id, "offerPrice", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 pl-5 focus:ring-4 focus:ring-amber-500/10 transition-all ${
              changes?.offerPrice !== undefined && changes?.offerPrice !== null
                ? "border-amber-400 text-amber-700"
                : "border-transparent text-gray-900 hover:border-gray-200 shadow-sm bg-gray-50/50"
            }`}
          />
        </div>
      </td>
      <td className="px-3 py-2.5 text-right w-24">
        <div className="inline-flex items-center relative w-full justify-end">
          <input
            type="number"
            inputMode="numeric"
            value={changes?.stock ?? product.stock}
            onChange={(e) => onChange(product.id, "stock", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 focus:ring-4 focus:ring-brand-500/10 transition-all ${
              changes?.stock !== undefined
                ? "border-brand-500 text-brand-700"
                : product.stock <= 5
                ? "border-amber-100 text-amber-600 bg-amber-50"
                : "border-transparent text-gray-600 hover:border-gray-200 shadow-sm"
            }`}
          />
          {product.stock <= 5 && changes?.stock === undefined && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
          )}
        </div>
      </td>
      <td className="px-3 py-2.5 text-right w-20">
        <div className="inline-flex items-center relative w-full justify-end">
          <input
            type="number"
            inputMode="numeric"
            value={changes?.minStock ?? product.minStock}
            onChange={(e) => onChange(product.id, "minStock", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 focus:ring-4 focus:ring-brand-500/10 transition-all ${
              changes?.minStock !== undefined ? "border-brand-500 text-brand-700" : "border-transparent text-gray-600 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
      <td className="px-3 py-2.5 text-right w-20">
        <div className="inline-flex items-center relative w-full justify-end">
          <input
            type="number"
            inputMode="numeric"
            value={changes?.optimumStock ?? product.optimumStock}
            onChange={(e) => onChange(product.id, "optimumStock", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 focus:ring-4 focus:ring-brand-500/10 transition-all ${
              changes?.optimumStock !== undefined
                ? "border-brand-500 text-brand-700"
                : "border-transparent text-gray-600 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
    </tr>
  );
});

export default EditableRow;
