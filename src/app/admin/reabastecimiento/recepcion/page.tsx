"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeftIcon, 
  CheckCircleIcon, 
  MagnifyingGlassIcon, 
  ExclamationCircleIcon,
  ArchiveBoxArrowDownIcon,
  BoltIcon
} from "@heroicons/react/24/outline";
import { useProducts } from "@/contexts/ProductContext";
import { useToast } from "@/contexts/ToastContext";
import { ProductUI } from "@/types";
import { updateProductAction } from "@/actions/products";

export default function ReceptionPage() {
  const { products } = useProducts();
  const { showToast } = useToast();
  const router = useRouter();

  const [scannedCode, setScannedCode] = useState("");
  const [activeProduct, setActiveProduct] = useState<ProductUI | null>(null);
  const [receiveQty, setReceiveQty] = useState<string>("1");
  const [isSaving, setIsSaving] = useState(false);
  const [history, setHistory] = useState<{ product: ProductUI; qty: number; date: string }[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // ════════════════════════════════════════════════════════════════════
  // SCANNER LISTENER
  // ════════════════════════════════════════════════════════════════════
  useEffect(() => {
    let barcodeBuffer = "";
    let lastKeyTime = Date.now();
    let timeoutId: NodeJS.Timeout;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside an input field (unless it's our scanner bypass)
      if (
        (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.tagName === "TEXTAREA"
      ) {
        return;
      }

      const currentTime = Date.now();
      
      // If delay between keystrokes is too long (> 50ms), it's probably manual typing
      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = "";
      }
      lastKeyTime = currentTime;

      if (e.key === "Enter") {
        if (barcodeBuffer.length > 2) {
          e.preventDefault();
          handleScannedBarcode(barcodeBuffer);
        }
        barcodeBuffer = "";
      } else if (e.key.length === 1) { // Normal character
        barcodeBuffer += e.key;
      }

      // Clear buffer safety
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        barcodeBuffer = "";
      }, 200);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timeoutId);
    };
  }, [products]);

  // ════════════════════════════════════════════════════════════════════
  // SEARCH & SELECT
  // ════════════════════════════════════════════════════════════════════

  const handleScannedBarcode = (code: string) => {
    const p = products.find(prod => prod.barcode === code || prod.id === code);
    if (p) {
      setActiveProduct(p);
      setReceiveQty("1");
      // Autoplay sound or visual cue could go here
    } else {
      showToast(`Producto no encontrado: ${code}`, "warning");
    }
  };

  const manualSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedCode) return;
    handleScannedBarcode(scannedCode);
    setScannedCode("");
  };

  // ════════════════════════════════════════════════════════════════════
  // RECEIVE
  // ════════════════════════════════════════════════════════════════════

  const saveReception = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProduct) return;
    const qty = parseInt(receiveQty, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast("La cantidad debe ser mayor a 0", "warning");
      return;
    }

    try {
      setIsSaving(true);
      const newStock = (activeProduct.stock || 0) + qty;
      
      const res = await fetch(`/api/admin/products`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
           id: activeProduct.id,
           updates: { stock: newStock }
        }),
      });

      if (!res.ok) throw new Error("Error en el servidor");
      
      // Update local history
      setHistory(prev => [{ product: activeProduct, qty, date: new Date().toLocaleTimeString() }, ...prev]);
      showToast(`+${qty} unidades de ${activeProduct.name} recibidas.`, "success");
      
      // Reset state for the next scan
      setActiveProduct(null);
      setReceiveQty("1");
      
      // Refocus document so scanner keeps working silently
      searchInputRef.current?.blur();
      
    } catch (err) {
      showToast("Error al procesar la recepción", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="-m-4 sm:-m-8 flex flex-col min-h-screen bg-gray-50">
      {/* ── Premium Header ── */}
      <div className="bg-emerald-950 p-8 sm:p-12 relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[100px]" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <Link href="/admin/reabastecimiento" className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 backdrop-blur-md rounded-full text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-4 border border-white/5 hover:bg-white/10 transition">
                    <ArrowLeftIcon className="size-3" />
                    <span>Volver</span>
                </Link>
                <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                  Recepción de Camión
                  <BoltIcon className="w-8 h-8 text-amber-400" />
                </h1>
                <p className="mt-2 text-emerald-100/50 font-medium italic">
                    Escanea los productos directamente desde las cajas.
                </p>
            </div>
            
            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 backdrop-blur-md border border-white/5 items-center">
                <ArchiveBoxArrowDownIcon className="w-8 h-8 text-emerald-400" />
                <div>
                   <p className="text-2xl font-black text-white">{history.length}</p>
                   <p className="text-[10px] text-emerald-100/50 uppercase font-black tracking-widest">Lotes Recibidos</p>
                </div>
            </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        
        {/* Lado Izquierdo: Escaneo / Active Product */}
        <div className="space-y-6">
            {/* Search Bar fallback */}
            <form onSubmit={manualSearch} className="relative shadow-sm rounded-2xl overflow-hidden group">
               <MagnifyingGlassIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
               <input 
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escanea el código de barras o escribe el SKU..."
                  value={scannedCode}
                  onChange={(e) => setScannedCode(e.target.value)}
                  className="w-full h-16 pl-14 pr-6 bg-white border-none text-lg font-bold placeholder-gray-300 focus:ring-4 focus:ring-emerald-500/20"
               />
               {scannedCode && (
                  <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold">
                    Buscar
                  </button>
               )}
            </form>

            <div className="text-center py-4 text-xs font-bold uppercase tracking-widest text-gray-400 border-b border-gray-200">
               Estado Actual
            </div>

            {/* Tarjeta de Producto Activo */}
            {!activeProduct ? (
               <div className="bg-white rounded-[2rem] border-2 border-dashed border-gray-200 p-12 text-center aspect-square md:aspect-auto flex flex-col justify-center items-center opacity-70">
                  <ArchiveBoxArrowDownIcon className="w-20 h-20 text-gray-300 mx-auto animate-bounce" />
                  <h3 className="text-2xl font-black text-gray-400 mt-6 uppercase tracking-widest">Esperando escaneo</h3>
                  <p className="text-sm text-gray-400 font-medium italic mt-2">Usa la pistola láser en cualquier momento.</p>
               </div>
            ) : (
               <form onSubmit={saveReception} className="bg-white rounded-[2rem] shadow-2xl shadow-emerald-500/10 border-2 border-emerald-500 overflow-hidden animate-in zoom-in-95 duration-200">
                  <div className="bg-emerald-500 p-6 flex gap-6 items-center">
                     {activeProduct.image ? (
                        <img src={activeProduct.image} className="w-24 h-24 rounded-2xl object-cover bg-white shadow-inner" />
                     ) : (
                        <div className="w-24 h-24 rounded-2xl bg-white/20 flex items-center justify-center text-4xl">📦</div>
                     )}
                     <div>
                        <h2 className="text-2xl font-black text-white leading-tight mb-1">{activeProduct.name}</h2>
                        <span className="px-2.5 py-1 rounded-md bg-emerald-900/40 font-mono text-xs text-emerald-100 font-bold border border-emerald-400/20">
                           {activeProduct.barcode || activeProduct.id.slice(0,8)}
                        </span>
                     </div>
                  </div>
                  
                  <div className="p-8">
                     <div className="flex justify-between items-center bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 shadow-inner">
                        <div className="text-center">
                           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Stock Actual</p>
                           <p className="text-3xl font-black text-gray-900">{activeProduct.stock}</p>
                        </div>
                        <ArrowLeftIcon className="w-6 h-6 text-gray-300 transform rotate-180" />
                        <div className="text-center text-emerald-600">
                           <p className="text-[10px] font-black uppercase tracking-widest mb-1">Nuevo Stock (Tras Recibir)</p>
                           <p className="text-3xl font-black">{(activeProduct.stock || 0) + parseInt(receiveQty || '0', 10)}</p>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="block text-sm font-black text-gray-900 uppercase tracking-widest">¿Cuántas unidades acaban de llegar?</label>
                        <div className="flex gap-4">
                           <button type="button" onClick={() => setReceiveQty(String(Math.max(1, parseInt(receiveQty||'1')-1)))} className="w-16 h-16 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-2xl active:scale-95 transition">-</button>
                           <input 
                             type="number"
                             min="1"
                             autoFocus
                             value={receiveQty}
                             onChange={(e) => setReceiveQty(e.target.value)}
                             className="flex-1 text-center text-4xl font-black tracking-tighter border-2 border-emerald-200 focus:border-emerald-500 rounded-2xl text-emerald-950 focus:ring-4 focus:ring-emerald-500/20"
                           />
                           <button type="button" onClick={() => setReceiveQty(String(parseInt(receiveQty||'1')+1))} className="w-16 h-16 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-2xl active:scale-95 transition">+</button>
                        </div>
                     </div>

                     <button 
                       type="submit" 
                       disabled={isSaving}
                       className="w-full mt-8 h-16 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all text-white font-black text-lg uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-3"
                     >
                       {isSaving ? "Guardando..." : "Confirmar Recepción"}
                       {!isSaving && <CheckCircleIcon className="w-6 h-6" />}
                     </button>
                  </div>
               </form>
            )}
        </div>

        {/* Lado Derecho: Historial de la Sesión */}
        <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl shadow-gray-200/50 border border-gray-100 min-h-[500px] flex flex-col h-full">
           <h3 className="text-lg font-black text-gray-900 mb-6 uppercase tracking-widest border-b border-gray-100 pb-4">
              Historial de esta sesión
           </h3>
           
           <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {history.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50 space-y-4">
                    <ArchiveBoxArrowDownIcon className="w-12 h-12" />
                    <p className="text-sm font-bold uppercase tracking-widest">Nada recibido aún.</p>
                 </div>
              ) : (
                 history.map((record, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-gray-50/80 border border-gray-100 hover:border-emerald-200 transition-colors animate-in slide-in-from-right-4">
                       {record.product.image ? (
                          <img src={record.product.image} className="w-12 h-12 rounded-xl object-cover" />
                       ) : (
                          <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex justify-center items-center text-gray-400">📦</div>
                       )}
                       <div className="flex-1 min-w-0 flex flex-col justify-center">
                          <p className="text-sm font-bold text-gray-900 truncate">{record.product.name}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">
                            SKU: {record.product.barcode || record.product.id.slice(0,8)} • {record.date}
                          </p>
                       </div>
                       <div className="shrink-0 flex items-center">
                          <span className="px-3 py-1.5 bg-emerald-100 text-emerald-800 font-black text-sm rounded-lg border border-emerald-200">
                             +{record.qty}
                          </span>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>

      </div>
    </div>
  );
}
