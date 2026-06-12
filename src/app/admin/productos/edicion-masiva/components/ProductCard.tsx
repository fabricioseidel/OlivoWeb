"use client";

import { memo } from "react";
import { hasRealImage } from "@/services/products";
import { CheckBadgeIcon, CheckIcon } from "@heroicons/react/24/outline";
import { isProductReady, type ProductChanges } from "../lib";
import CategorySelector from "./CategorySelector";

const ProductCard = memo(function ProductCard({
  product,
  changes,
  onChange,
  selected,
  onToggleSelect,
}: {
  product: any;
  changes?: ProductChanges;
  onChange: any;
  selected: boolean;
  onToggleSelect: (id: string) => void;
}) {
  const isDirty = Object.keys(changes || {}).length > 0;
  const ready = isProductReady(product, changes);
  const price = changes?.price ?? product.price;
  const stock = changes?.stock ?? product.stock;
  const cats = changes?.categories ?? product.categories ?? [];

  const missing: string[] = [];
  if (!hasRealImage(product)) missing.push("Sin foto");
  if (!(Number(price) > 0)) missing.push("Sin precio");
  if (!(Number(stock) > 0)) missing.push("Sin stock");
  if (!product.barcode) missing.push("Sin SKU");
  if (cats.length === 0) missing.push("Sin categoría");

  return (
    <div
      className={`relative rounded-3xl border-2 overflow-hidden bg-white transition-all ${
        selected
          ? "border-emerald-500 ring-4 ring-emerald-500/15 shadow-xl shadow-emerald-500/10"
          : isDirty
          ? "border-emerald-300 shadow-lg shadow-emerald-500/5"
          : "border-gray-100 shadow-sm hover:border-gray-200 hover:shadow-md"
      }`}
    >
      <button
        type="button"
        onClick={() => onToggleSelect(product.id)}
        title={selected ? "Quitar de la selección" : "Seleccionar"}
        className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all shadow ${
          selected
            ? "bg-emerald-500 border-emerald-500 text-white"
            : "bg-white/90 border-gray-300 text-transparent hover:border-emerald-400"
        }`}
      >
        <CheckIcon className="w-4 h-4" strokeWidth={3} />
      </button>

      {ready ? (
        <span className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow">
          <CheckBadgeIcon className="w-3.5 h-3.5" /> Listo
        </span>
      ) : (
        <span
          className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-rose-500/90 text-white text-[9px] font-black uppercase tracking-widest shadow"
          title={missing.join(", ")}
        >
          Faltan {missing.length}
        </span>
      )}

      <div
        className="h-28 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center cursor-pointer"
        onClick={() => onToggleSelect(product.id)}
      >
        {hasRealImage(product) ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-only card thumbnail with dynamic/external src
          <img src={product.image} alt={product.name} loading="lazy" className="h-full w-full object-contain p-2" />
        ) : (
          <span className="text-4xl opacity-40">📦</span>
        )}
      </div>

      <div className="p-3 space-y-2">
        <input
          type="text"
          value={changes?.name ?? product.name}
          onChange={(e) => onChange(product.id, "name", e.target.value)}
          className={`w-full text-sm font-black leading-tight bg-transparent border-b-2 pb-1 transition-all focus:outline-none focus:border-emerald-500 truncate ${
            changes?.name !== undefined ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-900 hover:border-gray-200"
          }`}
        />
        <p className="text-[9px] font-black text-gray-400 tracking-tighter uppercase truncate opacity-60">
          SKU: {product.barcode || String(product.id).slice(0, 15)}
        </p>

        {missing.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {missing.map((m) => (
              <span key={m} className="px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-500 text-[8px] font-black uppercase tracking-widest">
                {m}
              </span>
            ))}
          </div>
        )}

        <CategorySelector
          value={cats}
          isDirty={changes?.categories !== undefined}
          onChange={(next) => onChange(product.id, "categories", next)}
        />

        <div className="grid grid-cols-3 gap-1.5">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Precio</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={changes?.price ?? product.price}
                onChange={(e) => onChange(product.id, "price", e.target.value)}
                className={`w-full h-9 rounded-lg border border-gray-200 font-black text-xs pl-5 pr-1 shadow-inner ${
                  changes?.price !== undefined
                    ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                    : "bg-gray-50 text-gray-900 focus:bg-white focus:border-emerald-500"
                }`}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest px-1">Oferta</label>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">$</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="-"
                value={changes?.offerPrice !== undefined ? changes.offerPrice ?? "" : product.offerPrice || ""}
                onChange={(e) => onChange(product.id, "offerPrice", e.target.value)}
                className={`w-full h-9 rounded-lg border border-gray-200 font-black text-xs pl-5 pr-1 shadow-inner ${
                  changes?.offerPrice !== undefined && changes?.offerPrice !== null
                    ? "bg-amber-50 border-amber-300 text-amber-800"
                    : "bg-gray-50 text-gray-900 focus:bg-white focus:border-amber-500"
                }`}
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Stock</label>
            <input
              type="number"
              inputMode="numeric"
              value={changes?.stock ?? product.stock}
              onChange={(e) => onChange(product.id, "stock", e.target.value)}
              className={`w-full h-9 rounded-lg border border-gray-200 font-black text-xs px-2 text-center shadow-inner ${
                changes?.stock !== undefined
                  ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                  : product.stock <= 5
                  ? "bg-red-50 border-red-300 text-red-700"
                  : "bg-gray-50 text-gray-900 focus:bg-white focus:border-emerald-500"
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
