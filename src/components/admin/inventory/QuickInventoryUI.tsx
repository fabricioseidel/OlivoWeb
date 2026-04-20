"use client";

import React, { useState } from "react";
import { 
  ArrowLeftIcon, 
  TrashIcon, 
  PlusIcon, 
  MinusIcon, 
  CameraIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BoltIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useQuickInventory, InventoryMode } from "@/hooks/useQuickInventory";
import InventoryScanner from "./InventoryScanner";

interface QuickInventoryUIProps {
  mode: InventoryMode;
}

export default function QuickInventoryUI({ mode }: QuickInventoryUIProps) {
  const {
    items,
    addItem,
    updateQuantity,
    confirm,
    clear,
    isScanning,
    isSaving,
    error,
    success,
    totalItems
  } = useQuickInventory(mode);

  const [showScanner, setShowScanner] = useState(false);
  const [manualInput, setManualInput] = useState("");

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualInput.trim()) {
      addItem(manualInput.trim());
      setManualInput("");
    }
  };

  const isSale = mode === "SALE";

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] text-white -m-4 sm:-m-8">
      {/* Header */}
      <div className={`p-6 pb-12 ${isSale ? "bg-red-950/20" : "bg-emerald-950/20"} border-b border-white/5 relative overflow-hidden`}>
        <div className={`absolute top-0 right-0 w-64 h-64 ${isSale ? "bg-red-500/10" : "bg-emerald-500/10"} rounded-full blur-[100px] -mr-32 -mt-32`} />
        
        <div className="flex justify-between items-start relative z-10">
          <div>
            <Link href="/admin/productos" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors mb-4">
              <ArrowLeftIcon className="w-4 h-4" />
              Volver
            </Link>
            <h1 className="text-4xl font-black tracking-tight mb-2 uppercase italic flex items-center gap-3">
              {isSale ? "Venta Rápida" : "Compra Rápida"}
              <div className={`px-2 py-0.5 rounded text-[10px] ${isSale ? "bg-red-500 text-white" : "bg-emerald-500 text-black"}`}>
                V1.0
              </div>
            </h1>
            <p className="text-sm text-white/40 font-medium italic">
              {isSale ? "Descuenta stock escaneando productos." : "Suma stock de nuevos productos recibidos."}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Items Totales</div>
            <div className="text-5xl font-black tabular-nums">{totalItems}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-8 space-y-6 max-w-4xl mx-auto w-full pb-40">
        
        {/* Messages */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 p-6 rounded-[2rem] flex items-center gap-4 animate-in zoom-in-95">
            <div className="p-3 bg-emerald-500 rounded-2xl text-black">
              <CheckCircleIcon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-black uppercase tracking-tight text-emerald-400">Éxito</p>
              <p className="text-sm text-emerald-100/70">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 p-6 rounded-[2rem] flex items-center gap-4 animate-in zoom-in-95">
            <div className="p-3 bg-red-500 rounded-2xl text-white">
              <ExclamationCircleIcon className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-black uppercase tracking-tight text-red-400">Atención</p>
              <p className="text-sm text-red-100/70">{error}</p>
            </div>
          </div>
        )}

        {/* Manual Input Area */}
        <form onSubmit={handleManualSubmit} className="relative group">
           <div className="absolute inset-0 bg-white/5 rounded-3xl blur-xl group-focus-within:bg-white/10 transition-all" />
           <input 
             type="text"
             placeholder="ESCANEAR CON PISTOLA O ESCRIBIR SKU..."
             value={manualInput}
             onChange={(e) => setManualInput(e.target.value)}
             className="relative w-full h-20 bg-white/5 border-2 border-white/10 rounded-3xl px-8 text-xl font-black placeholder:text-white/10 focus:border-white/40 focus:ring-0 outline-none transition-all uppercase tracking-widest"
           />
           <button type="submit" className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-white hover:text-black transition-all">
             <PlusIcon className="w-6 h-6" />
           </button>
        </form>

        {/* List of Scanned Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">Lista de procesamiento</h2>
            {items.length > 0 && (
              <button onClick={clear} className="text-[10px] font-black uppercase tracking-widest text-red-400/50 hover:text-red-400 transition-colors">
                Limpiar todo
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center opacity-20 text-center px-8 border-2 border-dashed border-white/10 rounded-[3rem]">
              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <BoltIcon className="w-12 h-12" />
              </div>
              <p className="text-xl font-black uppercase tracking-widest">Esperando escaneo</p>
              <p className="text-xs font-medium italic mt-2 max-w-[200px]">Usa la pistola láser o presiona el botón de cámara abajo.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.product.barcode || item.product.id} className="group relative bg-white/5 hover:bg-white/[0.08] border border-white/5 rounded-[2rem] p-5 flex items-center gap-5 transition-all animate-in slide-in-from-bottom-2">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                    {item.product.image ? (
                      <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <ArchiveBoxIcon className="w-8 h-8 text-white/20" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-lg leading-tight truncate uppercase tracking-tight">{item.product.name}</h3>
                    <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">
                      SKU: {item.product.barcode || item.product.id} • STOCK ACTUAL: {item.product.stock}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                    <button 
                      onClick={() => updateQuantity(item.product.barcode || item.product.id, item.quantity - 1)}
                      className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <MinusIcon className="w-5 h-5" />
                    </button>
                    <span className="w-12 text-center text-xl font-black tabular-nums">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.product.barcode || item.product.id, item.quantity + 1)}
                      className="w-10 h-10 rounded-xl bg-white text-black flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <PlusIcon className="w-5 h-5" />
                    </button>
                  </div>

                  <button 
                    onClick={() => updateQuantity(item.product.barcode || item.product.id, 0)}
                    className="w-12 h-12 rounded-2xl hover:bg-red-500/20 text-red-500/40 hover:text-red-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Bar - iPhone Optimized */}
      <div className="fixed bottom-0 left-0 right-0 p-6 z-[100] pointer-events-none">
        <div className="max-w-md mx-auto flex gap-4 pointer-events-auto">
          {/* Camera Button */}
          <button 
            onClick={() => setShowScanner(true)}
            className="w-20 h-20 bg-white text-black rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-white/20 active:scale-90 transition-all border-4 border-black"
          >
            <CameraIcon className="w-8 h-8" />
          </button>

          {/* Confirm Button */}
          <button 
            onClick={confirm}
            disabled={items.length === 0 || isSaving}
            className={`flex-1 h-20 rounded-[2.5rem] flex items-center justify-center gap-4 text-lg font-black uppercase tracking-widest shadow-2xl transition-all border-4 border-black ${
              isSaving ? "bg-white/10 text-white/50" : 
              items.length === 0 ? "bg-white/5 text-white/20" : 
              isSale ? "bg-red-500 text-white shadow-red-500/20 active:bg-red-600" : "bg-emerald-500 text-black shadow-emerald-500/20 active:bg-emerald-600"
            }`}
          >
            {isSaving ? (
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isSale ? <ShoppingCartIcon className="w-6 h-6" /> : <ArchiveBoxIcon className="w-6 h-6" />}
                Confirmar {isSale ? "Venta" : "Compra"}
              </>
            )}
          </button>
        </div>
        
        {/* iPhone Indicator Spacer */}
        <div className="h-4" />
      </div>

      {/* Camera Overlay */}
      {showScanner && (
        <InventoryScanner 
          onScan={(code) => {
            addItem(code);
            // Optionally close after scan or keep open
            // For batching, we keep it open but show a toast
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {/* Scanning status feedback overlay (toast-like) */}
      {isScanning && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[300] bg-white text-black px-10 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 animate-in fade-in zoom-in-90">
           <div className="w-6 h-6 border-4 border-black/10 border-t-black rounded-full animate-spin" />
           <span className="font-black uppercase tracking-widest text-sm">Procesando...</span>
        </div>
      )}
    </div>
  );
}
