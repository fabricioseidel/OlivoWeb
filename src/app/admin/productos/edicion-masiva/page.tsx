"use client";

import { useState, useMemo, useEffect } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  FunnelIcon,
  ExclamationCircleIcon,
  PlusIcon,
  MinusIcon,
  PercentBadgeIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

type ProductChanges = { price?: number; offerPrice?: number | null; stock?: number; minStock?: number; optimumStock?: number; name?: string; categories?: string[] };

export default function BulkEditProductsPage() {
  const { products, updateProduct } = useProducts();
  const { showToast } = useToast();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editedChanges, setEditedChanges] = useState<Record<string, ProductChanges>>({});
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Sync with actual products context if needed (avoiding stale state)
  const [localProducts, setLocalProducts] = useState(products);
  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return localProducts.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            p.barcode?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesLowStock = filterLowStock ? p.stock <= 5 : true;
      return matchesSearch && matchesLowStock;
    });
  }, [localProducts, searchTerm, filterLowStock]);

  const handleInputChange = (productId: string, field: keyof ProductChanges, value: string | string[]) => {
    const originalProduct = products.find(p => p.id === productId);
    let newValue: any = value;
    let originalValue: any;

    if (field === 'price') {
      newValue = parseFloat(value as string);
      originalValue = originalProduct?.price;
    } else if (field === 'offerPrice') {
      newValue = value === "" ? null : parseFloat(value as string);
      originalValue = originalProduct?.offerPrice;
    } else if (field === 'stock' || field === 'minStock' || field === 'optimumStock') {
      newValue = parseInt(value as string, 10);
      originalValue = field === 'stock' ? originalProduct?.stock : field === 'minStock' ? originalProduct?.minStock : originalProduct?.optimumStock;
    } else if (field === 'name') {
      newValue = value;
      originalValue = originalProduct?.name;
    } else if (field === 'categories') {
      newValue = typeof value === 'string' ? value.split(',').map(s => s.trim()).filter(Boolean) : value;
      originalValue = originalProduct?.categories;
    }

    const isSame = Array.isArray(newValue) 
      ? JSON.stringify(newValue.concat().sort()) === JSON.stringify((originalValue || []).concat().sort())
      : newValue === originalValue;

    if (isSame || (field === 'price' && isNaN(newValue)) || (field === 'offerPrice' && isNaN(newValue) && newValue !== null) || (['stock', 'minStock', 'optimumStock'].includes(field) && isNaN(newValue))) {
      setEditedChanges(prev => {
        const next = { ...prev };
        if (next[productId]) {
          delete next[productId][field];
          if (Object.keys(next[productId]).length === 0) delete next[productId];
        }
        return next;
      });
      return;
    }

    setEditedChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: newValue
      }
    }));
  };

  const applyBulkAdjustment = (type: 'price_percent' | 'price_fixed' | 'stock_fixed', value: number) => {
    const newChanges = { ...editedChanges };
    
    filteredProducts.forEach(product => {
      const currentPrice = newChanges[product.id]?.price ?? product.price;
      const currentStock = newChanges[product.id]?.stock ?? product.stock;
      
      let nextPrice = currentPrice;
      let nextStock = currentStock;

      if (type === 'price_percent') {
        nextPrice = Math.round(currentPrice * (1 + value / 100));
      } else if (type === 'price_fixed') {
        nextPrice = currentPrice + value;
      } else if (type === 'stock_fixed') {
        nextStock = value;
      }

      if (nextPrice !== product.price || nextStock !== product.stock) {
        newChanges[product.id] = {
          ...newChanges[product.id],
          ...(nextPrice !== product.price ? { price: nextPrice } : {}),
          ...(nextStock !== product.stock ? { stock: nextStock } : {})
        };
      }
    });

    setEditedChanges(newChanges);
    showToast(`Ajuste aplicado a ${filteredProducts.length} productos`, "info");
    setShowBulkActions(false);
  };

  const saveAllChanges = async () => {
    const targetIds = Object.keys(editedChanges);
    const updateCount = targetIds.length;
    
    if (updateCount === 0) {
      showToast("No hay cambios pendientes", "info");
      return;
    }

    setIsSaving(true);
    let success = 0;
    
    try {
      // Usamos una copia local para ir actualizando sin recargar
      for (const id of targetIds) {
        const changes = editedChanges[id];
        await updateProduct(id, changes as any);
        success++;
      }
      
      showToast(`¡${success} productos actualizados con éxito!`, "success");
      setEditedChanges({});
      // Ya no necesitamos recargar la página porque useProducts debería actualizarse
      // Si el contexto no se actualiza automáticamente, podemos disparar un fetch o similar
    } catch (error) {
      showToast("Ocurrió un error al guardar algunos cambios", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(editedChanges).length > 0;
  const changedCount = Object.keys(editedChanges).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight mb-2 uppercase">Inventario <span className="text-emerald-600 italic">Smart</span></h1>
          <p className="text-sm text-gray-500 font-medium">Gestión rápida de precios y existencias.</p>
        </div>
        
        <div className="hidden md:flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="rounded-2xl border-2 font-bold px-6 h-14"
            disabled={isSaving}>
            <ArrowPathIcon className="w-5 h-5 mr-2" /> Refrescar
          </Button>
          <Button 
            onClick={saveAllChanges}
            disabled={!hasChanges || isSaving}
            className={`rounded-2xl px-10 h-14 font-black shadow-xl transition-all ${
              hasChanges 
                ? 'bg-emerald-600 shadow-emerald-500/20 scale-105' 
                : 'bg-gray-400 opacity-50'
            }`}
          >
            {isSaving ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <CloudArrowUpIcon className="w-5 h-5 mr-2" />
            )}
            Guardar {changedCount} cambios
          </Button>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-white rounded-[2rem] p-4 md:p-6 shadow-xl shadow-gray-200/50 border border-gray-100 mb-6 sticky top-4 z-30">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
             <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
             <input 
               type="text" 
               placeholder="Nombre, SKU o Barcode..."
               className="w-full pl-12 pr-6 h-14 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-medium text-gray-900 shadow-inner"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          
          <div className="flex gap-2">
             <button 
               onClick={() => setFilterLowStock(!filterLowStock)}
               className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-14 rounded-2xl font-bold transition-all border-2 ${
                 filterLowStock 
                   ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-lg shadow-amber-200/20' 
                   : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100'
               }`}
             >
               <ExclamationCircleIcon className="w-5 h-5 shrink-0" />
               <span className="md:hidden">Stock Bajo</span>
             </button>
             <button 
               onClick={() => setShowBulkActions(!showBulkActions)}
               className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-14 rounded-2xl font-bold transition-all border-2 ${
                showBulkActions 
                   ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                   : 'bg-gray-50 text-gray-400 border-transparent'
               }`}
             >
               <PercentBadgeIcon className="w-5 h-5 shrink-0" />
               <span className="hidden md:inline">Acciones Masivas</span>
             </button>
          </div>
        </div>

        {/* Panel de Acciones Masivas */}
        {showBulkActions && (
          <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 grid grid-cols-2 md:grid-cols-4 gap-3 animate-in slide-in-from-top-2 duration-300">
             <button onClick={() => applyBulkAdjustment('price_percent', 10)} className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm">
                <PlusIcon className="w-4 h-4 text-indigo-600 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">+10% Precio</span>
             </button>
             <button onClick={() => applyBulkAdjustment('price_percent', -10)} className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm">
                <MinusIcon className="w-4 h-4 text-indigo-600 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">-10% Precio</span>
             </button>
             <button onClick={() => applyBulkAdjustment('price_fixed', 100)} className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm">
                <div className="text-xs font-black text-indigo-600 mb-1">+$100</div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Aumentar Fijo</span>
             </button>
             <button onClick={() => {
               const stockStr = prompt("¿Qué stock quieres fijar para todos los productos visibles?", "10");
               if (stockStr) applyBulkAdjustment('stock_fixed', parseInt(stockStr));
             }} className="flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-indigo-100 hover:border-indigo-400 transition-colors shadow-sm">
                <CheckCircleIcon className="w-4 h-4 text-indigo-600 mb-1" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-900">Fijar Stock</span>
             </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="relative">
        
        {/* Desktop Table View */}
        <div className="hidden lg:block bg-white rounded-[2.5rem] shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-64 lg:w-80">Producto / SKU</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-48">Categorías (Comas)</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-32 text-right">Precio ($)</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-32 text-right">Oferta ($)</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-32 text-right">Stock Act.</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-24 text-right">Mínimo</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 w-24 text-right">Óptimo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((product) => (
                <EditableRow 
                  key={product.id} 
                  product={product} 
                  changes={editedChanges[product.id]} 
                  onChange={handleInputChange} 
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile/Tablet Card View */}
        <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-4">
           {filteredProducts.map((product) => (
             <EditableCard 
               key={product.id} 
               product={product} 
               changes={editedChanges[product.id]} 
               onChange={handleInputChange} 
             />
           ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="py-24 md:py-32 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-gray-100">
             <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">🔍</div>
             <p className="text-xl font-black text-gray-300 mb-1 tracking-widest uppercase">Sin productos</p>
             <p className="text-sm text-gray-400 font-medium italic">Prueba con términos más generales.</p>
          </div>
        )}
      </div>

      {/* Floating Bottom Bar (Mobile/Tablet) */}
      <div className="md:hidden fixed bottom-6 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500">
         <div className="bg-gray-950/90 backdrop-blur-md rounded-3xl p-4 shadow-2xl border border-white/10 flex items-center justify-between gap-4">
            <div className="flex flex-col">
               <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Inventory Manager</span>
               <span className="text-white text-sm font-bold">
                 {hasChanges ? `${changedCount} cambios pendientes` : 'Sin cambios listos'}
               </span>
            </div>
            <button 
              onClick={saveAllChanges}
              disabled={!hasChanges || isSaving}
              className={`h-12 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                hasChanges 
                 ? 'bg-emerald-500 text-white shadow-lg active:scale-95' 
                 : 'bg-white/10 text-white/30'
              }`}
            >
               {isSaving ? 'Guardando...' : 'Aplicar Todo'}
            </button>
         </div>
      </div>

      {/* Stats overlay (Desktop) */}
      <div className="hidden md:flex mt-8 justify-center gap-6 text-[10px] font-black uppercase tracking-widest text-gray-400 opacity-60">
         <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Cambios detectados</div>
         <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-500" /> Alerta Stock Bajo</div>
         <div className="flex items-center gap-2 italic">Desarrollado para Android & Chrome</div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────

function EditableRow({ product, changes, onChange }: { product: any, changes?: ProductChanges, onChange: any }) {
  const isDirty = Object.keys(changes || {}).length > 0;
  
  return (
    <tr className={`hover:bg-emerald-50/10 transition-colors group ${isDirty ? 'bg-emerald-50/5' : ''}`}>
      <td className="px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="relative group-hover:scale-110 transition-transform shrink-0 hidden sm:block">
             {product.image ? (
               <img src={product.image} className="w-10 h-10 rounded-xl object-cover shadow-sm bg-white border border-gray-100" />
             ) : (
               <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs">📦</div>
             )}
             {isDirty && <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />}
          </div>
          <div className="flex-1 min-w-0">
             <input 
               type="text"
               value={changes?.name ?? product.name}
               onChange={(e) => onChange(product.id, 'name', e.target.value)}
               className={`w-full text-sm font-bold leading-tight px-2 py-1 bg-transparent border-b-2 transition-all focus:outline-none focus:border-emerald-500 ${changes?.name !== undefined ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-800 hover:border-gray-300'}`}
             />
             <div className="flex items-center gap-2 px-2 mt-1">
                <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">SKU: {product.id?.slice(0, 10)}</span>
                {product.barcode && <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter border-l pl-2">{product.barcode}</span>}
             </div>
          </div>
        </div>
      </td>
      <td className="px-6 py-5">
         <input 
           type="text"
           value={changes?.categories ? changes.categories.join(", ") : (product.categories || []).join(", ")}
           onChange={(e) => onChange(product.id, 'categories', e.target.value)}
           placeholder="Categorías"
           className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.05em] transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${changes?.categories !== undefined ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-inner' : 'bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200'}`}
         />
      </td>
      <td className="px-6 py-5 text-right w-32">
        <div className="inline-flex items-center relative w-full justify-end">
          <span className="absolute left-3 text-xs font-bold text-gray-400 pointer-events-none">$</span>
          <input 
            type="number"
            inputMode="decimal"
            value={changes?.price ?? product.price}
            onChange={(e) => onChange(product.id, 'price', e.target.value)}
            className={`w-full h-11 bg-white text-right font-black text-sm rounded-xl border-2 px-3 pl-6 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
              changes?.price !== undefined ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-900 hover:border-gray-200 shadow-sm'
            }`}
          />
        </div>
      </td>
      <td className="px-6 py-5 text-right w-32">
        <div className="inline-flex items-center relative w-full justify-end">
          <span className="absolute left-3 text-xs font-bold text-gray-400 pointer-events-none">$</span>
          <input 
            type="number"
            inputMode="decimal"
            placeholder="-"
            value={changes?.offerPrice !== undefined ? changes.offerPrice : (product.offerPrice || '')}
            onChange={(e) => onChange(product.id, 'offerPrice', e.target.value)}
            className={`w-full h-11 bg-white text-right font-black text-sm rounded-xl border-2 px-3 pl-6 focus:ring-4 focus:ring-amber-500/10 transition-all ${
              changes?.offerPrice !== undefined && changes?.offerPrice !== null ? 'border-amber-400 text-amber-700' : 'border-transparent text-gray-900 hover:border-gray-200 shadow-sm bg-gray-50/50'
            }`}
          />
        </div>
      </td>
      <td className="px-6 py-5 text-right w-32">
        <div className="inline-flex items-center relative w-full justify-end">
           <input 
             type="number"
             inputMode="numeric"
             value={changes?.stock ?? product.stock}
             onChange={(e) => onChange(product.id, 'stock', e.target.value)}
             className={`w-full h-11 bg-white text-right font-black text-sm rounded-xl border-2 px-3 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
               changes?.stock !== undefined ? 'border-emerald-500 text-emerald-700' : 
               (product.stock <= 5 ? 'border-amber-100 text-amber-600 bg-amber-50' : 'border-transparent text-gray-600 hover:border-gray-200 shadow-sm')
             }`}
           />
           {product.stock <= 5 && changes?.stock === undefined && (
             <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-500 rounded-full" />
           )}
        </div>
      </td>
      <td className="px-6 py-5 text-right w-24">
        <div className="inline-flex items-center relative w-full justify-end">
           <input 
             type="number"
             inputMode="numeric"
             value={changes?.minStock ?? product.minStock}
             onChange={(e) => onChange(product.id, 'minStock', e.target.value)}
             className={`w-full h-11 bg-white text-right font-black text-sm rounded-xl border-2 px-3 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
               changes?.minStock !== undefined ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-600 hover:border-gray-200 shadow-sm'
             }`}
           />
        </div>
      </td>
      <td className="px-6 py-5 text-right w-24">
        <div className="inline-flex items-center relative w-full justify-end">
           <input 
             type="number"
             inputMode="numeric"
             value={changes?.optimumStock ?? product.optimumStock}
             onChange={(e) => onChange(product.id, 'optimumStock', e.target.value)}
             className={`w-full h-11 bg-white text-right font-black text-sm rounded-xl border-2 px-3 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
               changes?.optimumStock !== undefined ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-600 hover:border-gray-200 shadow-sm'
             }`}
           />
        </div>
      </td>
    </tr>
  );
}

function EditableCard({ product, changes, onChange }: { product: any, changes?: ProductChanges, onChange: any }) {
  const isDirty = Object.keys(changes || {}).length > 0;
  
  return (
    <div className={`p-4 rounded-[2rem] border-2 transition-all ${
      isDirty ? 'bg-emerald-50/30 border-emerald-500 shadow-lg shadow-emerald-500/5' : 'bg-white border-gray-100 shadow-sm'
    }`}>
       <div className="flex items-start gap-3 mb-4">
          <div className="relative shrink-0 mt-1">
             {product.image ? (
               <img src={product.image} className="w-12 h-12 rounded-xl object-cover shadow-sm bg-white border border-gray-100" />
             ) : (
               <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">📦</div>
             )}
             {isDirty && (
               <div className="absolute -top-2 -right-2 bg-emerald-500 text-white p-1 rounded-full border-4 border-white shadow-lg">
                 <CheckCircleIcon className="w-2 h-2" />
               </div>
             )}
          </div>
          <div className="flex-1 w-full min-w-0">
             <input 
               type="text"
               value={changes?.name ?? product.name}
               onChange={(e) => onChange(product.id, 'name', e.target.value)}
               className={`w-full text-sm font-black leading-tight bg-transparent border-b-2 pb-1 transition-all focus:outline-none focus:border-emerald-500 truncate ${changes?.name !== undefined ? 'border-emerald-500 text-emerald-700' : 'border-transparent text-gray-900 hover:border-gray-200'}`}
             />
             <p className="text-[10px] font-black text-gray-400 tracking-tighter uppercase truncate opacity-60 mt-1">
               SKU: {String(product.id).slice(0, 15)} 
             </p>
             <input 
               type="text"
               value={changes?.categories ? changes.categories.join(", ") : (product.categories || []).join(", ")}
               onChange={(e) => onChange(product.id, 'categories', e.target.value)}
               placeholder="Categorías"
               className={`mt-2 w-full px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${changes?.categories !== undefined ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500 border border-transparent hover:bg-gray-200'}`}
             />
          </div>
       </div>

       <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1.5">
             <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Precio</label>
             <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">$</span>
                <input 
                   type="number"
                   inputMode="decimal"
                   value={changes?.price ?? product.price}
                   onChange={(e) => onChange(product.id, 'price', e.target.value)}
                   className={`w-full h-10 rounded-xl border border-gray-200 font-black text-xs pl-6 pr-2 -inner ${
                     changes?.price !== undefined ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-gray-50 text-gray-900 focus-within:bg-white focus:border-emerald-500'
                   }`}
                />
             </div>
          </div>
          <div className="space-y-1.5">
             <label className="text-[8px] font-black text-amber-500/80 uppercase tracking-widest px-1">Oferta</label>
             <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">$</span>
                <input 
                   type="number"
                   inputMode="decimal"
                   placeholder="-"
                   value={changes?.offerPrice !== undefined ? changes.offerPrice : (product.offerPrice || '')}
                   onChange={(e) => onChange(product.id, 'offerPrice', e.target.value)}
                   className={`w-full h-10 rounded-xl border border-gray-200 font-black text-xs pl-6 pr-2 shadow-inner ${
                     changes?.offerPrice !== undefined && changes?.offerPrice !== null ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-gray-50 text-gray-900 focus-within:bg-white focus:border-amber-500'
                   }`}
                />
             </div>
          </div>
          <div className="space-y-1.5">
             <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Stock</label>
             <div className="relative">
                <input 
                   type="number"
                   inputMode="numeric"
                   value={changes?.stock ?? product.stock}
                   onChange={(e) => onChange(product.id, 'stock', e.target.value)}
                   className={`w-full h-10 rounded-xl border border-gray-200 font-black text-xs px-2 text-center shadow-inner ${
                     changes?.stock !== undefined ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 
                     (product.stock <= 5 ? 'bg-red-50 border-red-300 text-red-700' : 'bg-gray-50 text-gray-900 focus-within:bg-white focus:border-emerald-500')
                   }`}
                />
             </div>
          </div>
       </div>
    </div>
  );
}
