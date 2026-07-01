"use client";

import React from "react";
import { ArrowUpTrayIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { HFSS_OPTIONS, PRODUCT_TYPES, type UberEatsProduct } from "../lib";

interface ProductEditPanelProps {
  selectedProductForUpload: string | null;
  setSelectedProductForUpload: React.Dispatch<React.SetStateAction<string | null>>;
  products: UberEatsProduct[];
  uniqueCategories: string[];
  updateProduct: (id: string, field: keyof UberEatsProduct, value: any) => void;
  openImageUploadDialog: (barcode: string) => void;
  uploadingImage: string | null;
}

export default function ProductEditPanel({
  selectedProductForUpload,
  setSelectedProductForUpload,
  products,
  uniqueCategories,
  updateProduct,
  openImageUploadDialog,
  uploadingImage,
}: ProductEditPanelProps) {
  if (!selectedProductForUpload) return null;

  const product = products.find(p => p.id === selectedProductForUpload);
  if (!product) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end" onClick={() => setSelectedProductForUpload(null)}>
      <div className="bg-white h-full w-full max-w-2xl shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-emerald-600 text-white px-6 py-4 flex items-center justify-between z-10 shadow-md">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold">Editar Producto</h2>
            <p className="text-sm text-emerald-100 truncate">{product.name}</p>
          </div>
          <button onClick={() => setSelectedProductForUpload(null)} className="p-2 hover:bg-emerald-700 rounded-lg transition ml-4 flex-shrink-0">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Información Básica</h3>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Código de Barras</label><input type="text" value={product.barcode} onChange={(e) => updateProduct(product.id, "barcode", e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={product.name} onChange={(e) => updateProduct(product.id, "name", e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="Nombre + marca + tamaño" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label><textarea value={product.description} onChange={(e) => updateProduct(product.id, "description", e.target.value)} rows={3} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">External Data</label><input type="text" value={product.externalData || ""} onChange={(e) => updateProduct(product.id, "externalData", e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
          </div>

          {/* Categorías */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Categorías</h3>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1 bg-gray-50">
              {uniqueCategories.map((cat) => (
                <label key={cat} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white rounded cursor-pointer">
                  <input type="checkbox" checked={product.uberCategories.includes(cat)} onChange={(e) => { const newCats = e.target.checked ? [...product.uberCategories, cat] : product.uberCategories.filter((c) => c !== cat); updateProduct(product.id, 'uberCategories', newCats); updateProduct(product.id, 'uberCategory', newCats[0] || ''); }} className="rounded text-emerald-600" />
                  <span className={product.uberCategories.includes(cat) ? 'font-medium text-emerald-700' : ''}>{cat}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Precios */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Precios e Inventario</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label><div className="flex"><span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-lg">$</span><input type="number" step="0.01" value={product.priceWithVat} onChange={(e) => updateProduct(product.id, "priceWithVat", Number(e.target.value))} className="flex-1 px-3 py-2 border rounded-r-lg focus:ring-2 focus:ring-emerald-500" /></div></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">IVA %</label><input type="number" value={product.vatPercentage} onChange={(e) => updateProduct(product.id, "vatPercentage", Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Cantidad máx</label><input type="number" value={product.quantityRestriction ?? 5} onChange={(e) => updateProduct(product.id, "quantityRestriction", Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Stock</label><label className="flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer hover:bg-gray-50"><input type="checkbox" checked={!product.inStock} onChange={(e) => updateProduct(product.id, "inStock", !e.target.checked)} className="rounded text-emerald-600" /><span className={`text-sm font-medium ${product.inStock ? "text-green-600" : "text-red-600"}`}>{product.inStock ? "✓ En stock" : "✗ Sin stock"}</span></label></div>
            </div>
          </div>

          {/* Imagen */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Imagen</h3>
            <div className="flex gap-2">
              <input type="text" value={product.imageUrl} onChange={(e) => updateProduct(product.id, "imageUrl", e.target.value)} className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="URL de imagen" />
              <button type="button" onClick={() => openImageUploadDialog(product.id)} disabled={uploadingImage === product.id} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"><ArrowUpTrayIcon className="w-4 h-4" />{uploadingImage === product.id ? "..." : "Subir"}</button>
            </div>
            {product.imageUrl && product.imageUrl !== "null" && (
              // eslint-disable-next-line @next/next/no-img-element
              <div className="p-4 bg-gray-50 rounded-lg border"><img src={product.imageUrl} alt={product.name} className="h-40 w-auto object-contain mx-auto" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} /></div>
            )}
          </div>

          {/* Tipos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Tipos y Restricciones</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label><select value={product.productType} onChange={(e) => updateProduct(product.id, "productType", e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500">{PRODUCT_TYPES.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">HFSS</label><select value={product.hfssItem} onChange={(e) => updateProduct(product.id, "hfssItem", e.target.value)} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500">{HFSS_OPTIONS.map((h) => (<option key={h.value} value={h.value}>{h.label}</option>))}</select></div>
              {product.productType === "Alcohol" && (<div className="col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Unidades alcohol</label><input type="number" step="0.1" value={product.alcoholUnits ?? 0} onChange={(e) => updateProduct(product.id, "alcoholUnits", Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500" /></div>)}
            </div>
          </div>

          {/* Errores */}
          {!product.isValid && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex gap-2"><ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" /><div><h4 className="text-sm font-semibold text-red-800 mb-1">Errores:</h4><ul className="text-sm text-red-700 space-y-1">{product.validationErrors.map((e, i) => (<li key={i}>• {e}</li>))}</ul></div></div>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3 pt-6 border-t">
            <button onClick={() => setSelectedProductForUpload(null)} className="flex-1 px-4 py-3 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium">Cerrar</button>
            <button onClick={() => setSelectedProductForUpload(null)} className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium">✓ Guardar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
