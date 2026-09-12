"use client";

import { memo, useRef } from "react";
import { hasRealImage } from "@/services/products";
import {
  CheckBadgeIcon,
  CheckIcon,
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { compressImageFile } from "@/utils/image";
import { getProductDiagnostics, getVerifiedAt, isRecentlyCounted, type ProductChanges } from "../lib";
import CategorySelector from "./CategorySelector";

interface ProductCardProps {
  product: any;
  changes?: ProductChanges;
  onChange: (productId: string, field: keyof ProductChanges, value: any) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}

const ProductCard = memo(function ProductCard({
  product,
  changes,
  onChange,
  selected,
  onToggleSelect,
}: ProductCardProps) {
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
  const verifiedAt = getVerifiedAt(product);
  const recienContado = isRecentlyCounted(product);

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
    <div
      className={`relative rounded-3xl border-2 overflow-hidden bg-white transition-all ${
        selected
          ? "border-brand-500 ring-4 ring-brand-500/15 shadow-xl shadow-brand-500/10"
          : isDirty
          ? "border-brand-300 shadow-lg shadow-brand-500/5"
          : "border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-md"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleSelect(product.id)}
        title={selected ? "Quitar de la selección" : "Seleccionar"}
        className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow ${
          selected
            ? "bg-brand-500 border-brand-500 text-white"
            : "bg-white/90 border-gray-300 text-transparent hover:border-brand-400"
        }`}
      >
        <CheckIcon className="w-4 h-4" strokeWidth={3} />
      </button>

      {/* Badge superior de estado / completitud y toggle de vitrina */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
        {diag.isReady ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-wider shadow">
            <CheckBadgeIcon className="w-3.5 h-3.5" /> Listo
          </span>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-full text-white text-[9px] font-black uppercase tracking-wider shadow ${
              diag.missingCount === 1 ? "bg-amber-500" : "bg-rose-500"
            }`}
          >
            {diag.missingCount === 1 ? "¡Falta 1 dato!" : `Faltan ${diag.missingCount}`}
          </span>
        )}

        <button
          type="button"
          onClick={() => onChange(product.id, "isActive", !isActive)}
          title={isActive ? "Producto activo en vitrina (clic para pausar)" : "Producto oculto (clic para activar)"}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow transition-colors ${
            isActive
              ? "bg-brand-600 text-white hover:bg-brand-700"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
      </div>

      {/* Contenedor de Imagen con opción de subir directamente */}
      <div className="relative h-44 sm:h-36 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center group">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={displayImage}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain p-2"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 gap-1">
            <span className="text-3xl opacity-40">📦</span>
            <span className="text-[10px] font-bold text-gray-400">Sin foto</span>
          </div>
        )}

        {/* Botón overlay para cambiar o subir foto */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 font-bold text-xs cursor-pointer backdrop-blur-[1px]"
        >
          <CameraIcon className="w-6 h-6" />
          <span>{hasImage ? "Cambiar foto" : "Subir foto"}</span>
        </button>

        {isNewImage && (
          <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-brand-600 text-white text-[8px] font-black uppercase tracking-wider shadow">
            Foto nueva
          </span>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageFile}
        />
      </div>

      {/* Barra de progreso de completitud */}
      <div className="h-1 w-full bg-gray-100">
        <div
          className={`h-full transition-all duration-300 ${
            diag.isReady
              ? "bg-emerald-500"
              : diag.percentage >= 60
              ? "bg-amber-400"
              : "bg-rose-400"
          }`}
          style={{ width: `${diag.percentage}%` }}
        />
      </div>

      <div className="p-3 space-y-2">
        <input
          type="text"
          value={changes?.name ?? product.name}
          onChange={(e) => onChange(product.id, "name", e.target.value)}
          className={`w-full text-sm font-black leading-tight bg-transparent border-b-2 pb-1 transition-all focus:outline-none focus:border-brand-500 truncate ${
            changes?.name !== undefined ? "border-brand-500 text-brand-700" : "border-transparent text-gray-900 hover:border-gray-200"
          }`}
        />
        <input
          type="text"
          title="Código de barras — cambiarlo renombra el identificador del producto"
          value={changes?.barcode ?? product.barcode ?? ""}
          onChange={(e) => onChange(product.id, "barcode", e.target.value)}
          placeholder={`SKU: ${String(product.id).slice(0, 15)}`}
          className={`w-full text-[9px] font-black tracking-tighter uppercase bg-transparent border-b truncate transition-all focus:outline-none focus:border-violet-500 ${
            changes?.barcode !== undefined ? "border-violet-500 text-violet-600" : "border-transparent text-gray-400 opacity-60 hover:border-gray-200"
          }`}
        />

        {diag.missing.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {diag.missing.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  if (m === "Sin foto") fileInputRef.current?.click();
                }}
                className={`px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border transition-colors ${
                  m === "Sin foto"
                    ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 cursor-pointer"
                    : "bg-rose-50 text-rose-500 border-rose-100"
                }`}
              >
                {m === "Sin foto" ? "📷 Subir foto" : m}
              </button>
            ))}
            {!diag.hasCost && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200 text-[8px] font-black uppercase tracking-wider">
                Sin costo
              </span>
            )}
          </div>
        )}

        {/* Marca del conteo físico: separa "stock real, alguien lo tuvo en la
            mano" de "stock que quedó de una carga vieja". */}
        {verifiedAt !== null && (
          <span
            title={`Escaneado en un conteo físico el ${new Date(verifiedAt).toLocaleString("es-CL")}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider border ${
              recienContado
                ? "bg-teal-50 text-teal-700 border-teal-200"
                : "bg-gray-50 text-gray-500 border-gray-200"
            }`}
          >
            ✅ Contado {new Date(verifiedAt).toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })}
          </span>
        )}

        <CategorySelector
          value={cats}
          isDirty={changes?.categories !== undefined}
          onChange={(next) => onChange(product.id, "categories", next)}
        />

        {/* Grilla de valores numéricos: Precio, Oferta, Costo, Stock */}
        <div className="grid grid-cols-4 gap-1 pt-1">
          <div className="space-y-0.5">
            <label className="text-[7px] font-black text-gray-400 uppercase tracking-wider px-0.5">Precio</label>
            <div className="relative">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={price ?? ""}
                onChange={(e) => onChange(product.id, "price", e.target.value)}
                placeholder="0"
                className={`w-full h-8 rounded-lg border font-black text-xs pl-4 pr-1 text-right shadow-inner ${
                  changes?.price !== undefined
                    ? "bg-brand-50 border-brand-300 text-brand-800"
                    : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-brand-500"
                }`}
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <label className="text-[7px] font-black text-amber-600 uppercase tracking-wider px-0.5">Oferta</label>
            <div className="relative">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="-"
                value={offerPrice !== undefined && offerPrice !== null ? offerPrice : ""}
                onChange={(e) => onChange(product.id, "offerPrice", e.target.value)}
                className={`w-full h-8 rounded-lg border font-black text-xs pl-4 pr-1 text-right shadow-inner ${
                  changes?.offerPrice !== undefined && changes?.offerPrice !== null
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-amber-500"
                }`}
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <label className="text-[7px] font-black text-indigo-500 uppercase tracking-wider px-0.5">Costo</label>
            <div className="relative">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={purchasePrice !== undefined && purchasePrice !== null ? purchasePrice : ""}
                onChange={(e) => onChange(product.id, "purchasePrice", e.target.value)}
                className={`w-full h-8 rounded-lg border font-black text-xs pl-4 pr-1 text-right shadow-inner ${
                  changes?.purchasePrice !== undefined
                    ? "bg-indigo-50 border-indigo-300 text-indigo-800"
                    : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-indigo-500"
                }`}
              />
            </div>
          </div>

          <div className="space-y-0.5">
            <label className="text-[7px] font-black text-gray-400 uppercase tracking-wider px-0.5">Stock</label>
            <input
              type="number"
              inputMode="numeric"
              value={stock ?? ""}
              onChange={(e) => onChange(product.id, "stock", e.target.value)}
              placeholder="0"
              className={`w-full h-8 rounded-lg border font-black text-xs px-1 text-center shadow-inner ${
                changes?.stock !== undefined
                  ? "bg-brand-50 border-brand-300 text-brand-800"
                  : stock <= 0
                  ? "bg-rose-50 border-rose-300 text-rose-700"
                  : stock <= 5
                  ? "bg-amber-50 border-amber-300 text-amber-700"
                  : "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-brand-500"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
