"use client";

import { memo, useRef } from "react";
import { hasRealImage } from "@/services/products";
import { CheckBadgeIcon, ClipboardDocumentIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import { isProductReady, type ProductChanges } from "../lib";
import CategorySelector from "./CategorySelector";

const EditableRow = memo(function EditableRow({
  product,
  changes,
  onChange,
  pendingImage,
  onImagePick,
  onClearPendingImage,
}: {
  product: any;
  changes?: ProductChanges;
  onChange: any;
  pendingImage?: string;
  onImagePick: (productId: string, file?: File) => void;
  onClearPendingImage: (productId: string) => void;
}) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDirty = Object.keys(changes || {}).length > 0;
  const ready = isProductReady(product, changes);

  return (
    <tr className={`hover:bg-emerald-50/10 transition-colors group ${isDirty ? "bg-emerald-50/5" : ""}`}>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-3">
          <div
            className="relative shrink-0 hidden sm:block cursor-pointer group/thumb"
            onClick={() => fileInputRef.current?.click()}
            title={pendingImage || hasRealImage(product) ? "Reemplazar imagen" : "Subir imagen"}
          >
            {pendingImage || hasRealImage(product) ? (
              // eslint-disable-next-line @next/next/no-img-element -- admin-only table thumbnail with dynamic/external src
              <img src={pendingImage || product.image} alt={product.name} className="w-9 h-9 rounded-lg object-cover shadow-sm bg-white border border-gray-100" />
            ) : (
              <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">📦</div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/50 rounded-lg transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover/thumb:opacity-100 text-white text-[7px] font-black uppercase text-center leading-tight">
                {pendingImage || hasRealImage(product) ? "Cambiar" : "Subir"}
              </span>
            </div>
            {pendingImage ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearPendingImage(product.id);
                }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-white text-red-600 rounded-full flex items-center justify-center shadow border border-red-100"
                title="Quitar imagen pendiente"
              >
                <XMarkIcon className="w-2.5 h-2.5" />
              </button>
            ) : (
              isDirty && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                onImagePick(product.id, e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {ready && <CheckBadgeIcon className="w-4 h-4 text-emerald-500 shrink-0" title="Listo para mostrar" />}
              <input
                type="text"
                value={changes?.name ?? product.name}
                onChange={(e) => onChange(product.id, "name", e.target.value)}
                className={`flex-1 min-w-0 text-sm font-bold leading-tight px-1 py-0.5 bg-transparent border-b-2 transition-all focus:outline-none focus:border-emerald-500 ${
                  changes?.name !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-800 hover:border-gray-300"
                }`}
              />
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(changes?.name ?? product.name);
                    showToast("Nombre copiado", "success");
                  } catch {
                    showToast("No se pudo copiar", "error");
                  }
                }}
                title="Copiar nombre"
                className="shrink-0 p-1 rounded-md text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <ClipboardDocumentIcon className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-2 px-1 mt-0.5">
              {product.barcode ? (
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">{product.barcode}</span>
              ) : (
                <span className="text-[9px] font-black text-rose-300 uppercase tracking-tighter">Sin SKU</span>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <CategorySelector
          value={changes?.categories ?? product.categories ?? []}
          isDirty={changes?.categories !== undefined}
          onChange={(next) => onChange(product.id, "categories", next)}
        />
      </td>
      <td className="px-3 py-2.5 text-right w-28">
        <div className="inline-flex items-center relative w-full justify-end">
          <span className="absolute left-2 text-xs font-bold text-gray-400 pointer-events-none">$</span>
          <input
            type="number"
            inputMode="decimal"
            value={changes?.price ?? product.price}
            onChange={(e) => onChange(product.id, "price", e.target.value)}
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 pl-5 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.price !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-900 hover:border-gray-200 shadow-sm"
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
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.stock !== undefined
                ? "border-emerald-500 text-emerald-700"
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
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.minStock !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-600 hover:border-gray-200 shadow-sm"
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
            className={`w-full h-9 bg-white text-right font-black text-sm rounded-lg border-2 px-2 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.optimumStock !== undefined
                ? "border-emerald-500 text-emerald-700"
                : "border-transparent text-gray-600 hover:border-gray-200 shadow-sm"
            }`}
          />
        </div>
      </td>
    </tr>
  );
});

export default EditableRow;
