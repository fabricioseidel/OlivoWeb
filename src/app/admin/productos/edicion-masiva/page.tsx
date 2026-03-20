"use client";

import { useState, useMemo } from "react";
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import Button from "@/components/ui/Button";
import {
  MagnifyingGlassIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  FunnelIcon,
  ExclamationCircleIcon
} from "@heroicons/react/24/outline";

export default function BulkEditProductsPage() {
  const { products, updateProduct } = useProducts();
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editedChanges, setEditedChanges] = useState<Record<string, { price?: number; stock?: number }>>({});
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Filtrado de productos
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           (p.id?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesLowStock = filterLowStock ? p.stock <= 5 : true;
      return matchesSearch && matchesLowStock;
    });
  }, [products, searchTerm, filterLowStock]);

  const handleInputChange = (productId: string, field: 'price' | 'stock', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    setEditedChanges(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: numValue
      }
    }));
  };

  const saveAllChanges = async () => {
    const updateCount = Object.keys(editedChanges).length;
    if (updateCount === 0) {
      showToast("No hay cambios pendientes", "info");
      return;
    }

    setIsSaving(true);
    let success = 0;
    
    try {
      for (const [id, changes] of Object.entries(editedChanges)) {
        await updateProduct(id, changes);
        success++;
      }
      showToast(`¡${success} productos actualizados con éxito!`, "success");
      setEditedChanges({});
      // Reload page to reflect changes since refreshProducts was removed
      window.location.reload();
    } catch (error) {
      showToast("Ocurrió un error al guardar algunos cambios", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = Object.keys(editedChanges).length > 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Editor de Inventario ⚡</h1>
          <p className="text-gray-500 font-medium">Actualiza precios y stock de forma instantánea.</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => window.location.reload()}
            className="rounded-2xl border-2 font-bold px-6 h-14"
            disabled={isSaving}>
            <ArrowPathIcon className="w-5 h-5" />
          </Button>
          <Button 
            onClick={saveAllChanges}
            disabled={!hasChanges || isSaving}
            className={`rounded-2xl px-10 h-14 font-black shadow-xl transition-all ${
              hasChanges 
                ? 'bg-emerald-600 shadow-emerald-500/20 scale-105 mr-2' 
                : 'bg-gray-400 opacity-50'
            }`}
          >
            {isSaving ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <CloudArrowUpIcon className="w-5 h-5 mr-2 " />
                Guardar {Object.keys(editedChanges).length} cambios
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Barra de Herramientas */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
           <MagnifyingGlassIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
           <input 
             type="text" 
             placeholder="Buscar por nombre o SKU..."
             className="w-full pl-14 pr-6 h-14 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-medium text-gray-900"
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
           />
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           <button 
             onClick={() => setFilterLowStock(!filterLowStock)}
             className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-14 rounded-2xl font-bold transition-all ${
               filterLowStock 
                 ? 'bg-amber-100 text-amber-700 border-2 border-amber-200 shadow-lg shadow-amber-200/20' 
                 : 'bg-gray-50 text-gray-500 border-2 border-transparent'
             }`}
           >
             <ExclamationCircleIcon className="w-5 h-5" />
             Stock Bajo
           </button>
           <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 h-14 bg-gray-50 text-gray-500 rounded-2xl font-bold border-2 border-transparent">
             <FunnelIcon className="w-5 h-5" />
             Filtros
           </button>
        </div>
      </div>

      {/* Tabla Premium */}
      <div className="bg-white rounded-[3rem] shadow-2xl shadow-gray-200/40 border border-gray-50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Producto</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Categoría</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 w-48 text-right">Precio ($)</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-gray-400 w-48 text-right">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-emerald-50/20 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      {product.image ? (
                        <img src={product.image} className="w-12 h-12 rounded-xl object-cover shadow-sm group-hover:scale-110 transition-transform" />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">📦</div>
                      )}
                      <div>
                        <p className="font-bold text-gray-900 group-hover:text-emerald-700">{product.name}</p>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-tighter">SKU: {product.id?.slice(0, 12)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-widest">
                      {Array.isArray(product.categories) && product.categories.length > 0 ? product.categories[0] : 'General'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <input 
                      type="number"
                      defaultValue={product.price}
                      className={`w-full h-12 bg-transparent text-right font-black text-xl rounded-xl border-2 px-4 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
                        editedChanges[product.id]?.price ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : 'border-transparent text-gray-900'
                      }`}
                      onChange={(e) => handleInputChange(product.id, 'price', e.target.value)}
                    />
                  </td>
                  <td className="px-8 py-6">
                    <div className="relative">
                      <input 
                        type="number"
                        defaultValue={product.stock}
                        className={`w-full h-12 bg-transparent text-right font-black text-xl rounded-xl border-2 px-10 focus:ring-4 focus:ring-emerald-500/10 transition-all ${
                          editedChanges[product.id]?.stock ? 'border-emerald-500 text-emerald-700 bg-emerald-50' : 'border-transparent'
                        } ${product.stock <= 5 && !editedChanges[product.id]?.stock ? 'text-amber-600 bg-amber-50' : 'text-gray-900'}`}
                        onChange={(e) => handleInputChange(product.id, 'stock', e.target.value)}
                      />
                      {product.stock <= 5 && !editedChanges[product.id]?.stock && (
                        <ExclamationCircleIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="py-32 text-center">
             <p className="text-2xl font-black text-gray-200 mb-2 tracking-tighter uppercase">No se encontraron productos</p>
             <p className="text-gray-400 font-medium">Intenta con otra búsqueda o limpia los filtros.</p>
          </div>
        )}
      </div>

      {/* Info de Atajos */}
      <div className="mt-8 flex items-center justify-center gap-8 text-[10px] font-black uppercase tracking-widest text-gray-300">
         <div className="flex items-center gap-2 italic">
           <span className="bg-gray-200 px-2 py-1 rounded text-gray-500">TAB</span> Navegar entre campos
         </div>
         <div className="flex items-center gap-2 italic">
           <span className="bg-emerald-200 px-2 py-1 rounded text-emerald-600">VERDE</span> Indica cambio sin guardar
         </div>
      </div>
    </div>
  );
}
