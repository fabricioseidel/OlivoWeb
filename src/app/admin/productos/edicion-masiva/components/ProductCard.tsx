"use client";

import { memo, useRef } from "react";
import {
  ArrowUturnLeftIcon,
  CheckBadgeIcon,
  CheckIcon,
  CameraIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import { compressImageFile } from "@/utils/image";
import {
  getPriceWarnings,
  getProductDiagnostics,
  getVerifiedAt,
  isRecentlyCounted,
  type ProductChanges,
} from "../lib";
import CategorySelector from "./CategorySelector";
import NumberCell from "./NumberCell";

interface ProductCardProps {
  product: any;
  changes?: ProductChanges;
  rowIndex: number;
  onChange: (productId: string, field: keyof ProductChanges, value: any) => void;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onRevert: (productId: string) => void;
  onPasteColumn: (productId: string, field: keyof ProductChanges, values: string[]) => void;
}

const CELL = "h-9 text-xs rounded-lg border px-1.5";
const IDLE = "bg-gray-50 border-gray-200 text-gray-900 focus:bg-white focus:border-brand-500 focus:ring-brand-500/10";
const LABEL = "block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-0.5";

const ProductCard = memo(function ProductCard({
  product,
  changes,
  rowIndex,
  onChange,
  selected,
  onToggleSelect,
  onRevert,
  onPasteColumn,
}: ProductCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDirty = Object.keys(changes || {}).length > 0;
  const diag = getProductDiagnostics(product, changes);
  const warnings = getPriceWarnings(product, changes);

  const displayImage = changes?.image !== undefined ? changes.image : product.image;
  const hasImage = Boolean(displayImage && displayImage !== "/file.svg");
  const isNewImage = changes?.image !== undefined;

  const name = changes?.name ?? product.name;
  const price = changes?.price ?? product.price;
  const offerPrice = changes?.offerPrice !== undefined ? changes.offerPrice : product.offerPrice || null;
  const purchasePrice = changes?.purchasePrice ?? product.purchasePrice;
  const stock = Number(changes?.stock ?? product.stock ?? 0);
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

  const paste = (field: keyof ProductChanges) => (values: string[]) => onPasteColumn(product.id, field, values);

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
        aria-pressed={selected}
        aria-label={selected ? `Quitar ${name} de la selección` : `Seleccionar ${name}`}
        title={selected ? "Quitar de la selección" : "Seleccionar"}
        className={`absolute top-2 left-2 z-10 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all shadow ${
          selected
            ? "bg-brand-500 border-brand-500 text-white"
            : "bg-white/90 border-gray-300 text-transparent hover:border-brand-400"
        }`}
      >
        <CheckIcon className="w-4 h-4" strokeWidth={3} />
      </button>

      {/* Estado y vitrina */}
      <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
        {diag.isReady ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow">
            <CheckBadgeIcon className="w-3.5 h-3.5" /> Listo
          </span>
        ) : diag.missingDataCount === 0 ? (
          <span className="px-2 py-0.5 rounded-full bg-gray-700 text-white text-[10px] font-bold shadow">
            Datos OK · sin stock
          </span>
        ) : (
          <span
            className={`px-2 py-0.5 rounded-full text-white text-[10px] font-bold shadow ${
              diag.missingDataCount === 1 ? "bg-amber-600" : "bg-rose-600"
            }`}
          >
            {diag.missingDataCount === 1 ? "Falta 1 dato" : `Faltan ${diag.missingDataCount} datos`}
          </span>
        )}

        <button
          type="button"
          onClick={() => onChange(product.id, "isActive", !isActive)}
          aria-pressed={isActive}
          title={isActive ? "Activo en la tienda (clic para ocultar)" : "Oculto en la tienda (clic para activar)"}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold shadow transition-colors ${
            changes?.isActive !== undefined ? "ring-2 ring-brand-300 " : ""
          }${isActive ? "bg-brand-600 text-white hover:bg-brand-700" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
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

      {/* Imagen: tocarla abre la cámara / galería */}
      <div className="relative h-44 sm:h-36 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center group">
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={displayImage} alt="" loading="lazy" className="h-full w-full object-contain p-2" />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 gap-1">
            <span className="text-3xl opacity-40">📦</span>
            <span className="text-xs font-bold">Sin foto</span>
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label={hasImage ? `Cambiar foto de ${name}` : `Subir foto de ${name}`}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 font-bold text-xs cursor-pointer"
        >
          <CameraIcon className="w-6 h-6" />
          <span>{hasImage ? "Cambiar foto" : "Subir foto"}</span>
        </button>

        {isNewImage && (
          <span className="absolute bottom-1.5 left-2 px-1.5 py-0.5 rounded bg-brand-600 text-white text-[10px] font-bold shadow">
            Foto nueva
          </span>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
      </div>

      {/* Progreso: 4 datos de ficha + stock */}
      <div className="h-1 w-full bg-gray-100">
        <div
          className={`h-full transition-all duration-300 ${
            diag.isReady ? "bg-emerald-500" : diag.percentage >= 60 ? "bg-amber-400" : "bg-rose-400"
          }`}
          style={{ width: `${diag.percentage}%` }}
        />
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-start gap-1">
          <input
            type="text"
            value={name}
            title={name}
            aria-label="Nombre"
            onChange={(e) => onChange(product.id, "name", e.target.value)}
            className={`flex-1 min-w-0 text-sm font-black leading-tight bg-transparent border-b-2 pb-1 transition-all focus:outline-none focus:border-brand-500 truncate ${
              changes?.name !== undefined ? "border-brand-500 text-brand-700" : "border-transparent text-gray-900 hover:border-gray-200"
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
        <input
          type="text"
          aria-label="Código de barras"
          title="Código de barras — cambiarlo renombra el identificador del producto (se confirma al guardar)"
          value={changes?.barcode ?? product.barcode ?? ""}
          onChange={(e) => onChange(product.id, "barcode", e.target.value)}
          placeholder="Sin SKU"
          className={`w-full text-[11px] font-mono font-semibold bg-transparent border-b truncate transition-all focus:outline-none focus:border-violet-500 ${
            changes?.barcode !== undefined ? "border-violet-500 text-violet-700" : "border-transparent text-gray-500 hover:border-gray-200"
          }`}
        />

        {(diag.missingData.length > 0 || !diag.hasCost || warnings.length > 0) && (
          <div className="flex flex-wrap gap-1">
            {diag.missingData.map((m) =>
              m === "Sin foto" ? (
                <button
                  key={m}
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-1.5 py-0.5 rounded-md text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                >
                  📷 Subir foto
                </button>
              ) : (
                <span key={m} className="px-1.5 py-0.5 rounded-md text-[10px] font-bold border bg-rose-50 text-rose-700 border-rose-200">
                  {m}
                </span>
              )
            )}
            {!diag.hasCost && (
              <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                Sin costo
              </span>
            )}
            {warnings.map((w) => (
              <span key={w} className="px-1.5 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-bold">
                ⚠ {w}
              </span>
            ))}
          </div>
        )}

        {/* Marca del conteo físico: separa "stock real, alguien lo tuvo en la
            mano" de "stock que quedó de una carga vieja". */}
        {verifiedAt !== null && (
          <span
            title={`Escaneado en un conteo físico el ${new Date(verifiedAt).toLocaleString("es-CL")}`}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
              recienContado ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-gray-50 text-gray-600 border-gray-200"
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

        {/* Precio, oferta, costo y stock */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <div>
            <span className={LABEL}>Precio</span>
            <NumberCell
              value={price}
              field="price"
              rowIndex={rowIndex}
              prefix="$"
              placeholder="0"
              label={`Precio de ${name}`}
              onCommit={(t) => onChange(product.id, "price", t)}
              onPasteColumn={paste("price")}
              sizeClass={CELL}
              stateClass={
                warnings.length > 0
                  ? "bg-rose-50 border-rose-400 text-rose-700 focus:ring-rose-500/10"
                  : changes?.price !== undefined
                  ? "bg-brand-50 border-brand-300 text-brand-800 focus:ring-brand-500/10"
                  : IDLE
              }
            />
          </div>
          <div>
            <span className={LABEL}>Oferta</span>
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
                  ? "bg-amber-50 border-amber-300 text-amber-800 focus:ring-amber-500/10"
                  : IDLE
              }
            />
          </div>
          <div>
            <span className={LABEL}>Costo</span>
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
                  ? "bg-indigo-50 border-indigo-300 text-indigo-800 focus:ring-indigo-500/10"
                  : IDLE
              }
            />
          </div>
          <div>
            <span className={LABEL}>Stock</span>
            <NumberCell
              value={changes?.stock ?? product.stock}
              field="stock"
              rowIndex={rowIndex}
              integer
              placeholder="0"
              label={`Stock de ${name}`}
              onCommit={(t) => onChange(product.id, "stock", t)}
              onPasteColumn={paste("stock")}
              sizeClass={CELL}
              stateClass={
                changes?.stock !== undefined
                  ? "bg-brand-50 border-brand-300 text-brand-800 focus:ring-brand-500/10"
                  : stock <= 0
                  ? "bg-rose-50 border-rose-300 text-rose-700 focus:ring-rose-500/10"
                  : stock <= 5
                  ? "bg-amber-50 border-amber-300 text-amber-700 focus:ring-amber-500/10"
                  : IDLE
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
