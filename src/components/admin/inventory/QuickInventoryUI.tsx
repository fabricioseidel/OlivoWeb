"use client";

import React from "react";
import { 
  ArrowLeftIcon, 
  TrashIcon, 
  PlusIcon, 
  MinusIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  BoltIcon
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useQuickInventory, InventoryMode } from "@/hooks/useQuickInventory";
import IPhoneScannerView from "./IPhoneScannerView";

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

  const isSale = mode === "SALE";

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-[#000000] text-white rounded-[3rem] overflow-hidden relative shadow-2xl">
      {/* Header */}
      <div className={`p-6 sm:p-8 ${isSale ? "bg-red-950/20" : "bg-emerald-950/20"} border-b border-white/5 relative shrink-0`}>
        <div className={`absolute top-0 right-0 w-64 h-64 ${isSale ? "bg-red-500/10" : "bg-emerald-500/10"} rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none`} />
        
        <div className="flex justify-between items-start relative z-10">
          <div>
            <Link href="/admin/productos" className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors mb-4 w-fit">
              <ArrowLeftIcon className="w-4 h-4" />
              Volver
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 uppercase italic flex items-center gap-3">
              {isSale ? "Venta Rápida" : "Compra Rápida"}
            </h1>
            <p className="text-sm text-white/40 font-medium italic">
              {isSale ? "Descuenta stock escaneando." : "Suma stock de nuevos ingresos."}
            </p>
          </div>
          
          <div className="text-right">
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1">Total</div>
            <div className="text-4xl sm:text-5xl font-black tabular-nums">{totalItems}</div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 flex flex-col max-w-3xl mx-auto w-full">
        
        {/* Messages */}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 p-4 sm:p-6 rounded-[2rem] flex items-center gap-4 shrink-0 animate-in zoom-in-95">
            <div className="p-3 bg-emerald-500 rounded-2xl text-black shrink-0">
              <CheckCircleIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-black uppercase tracking-tight text-emerald-400">Éxito</p>
              <p className="text-sm text-emerald-100/70">{success}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 p-4 sm:p-6 rounded-[2rem] flex items-center gap-4 shrink-0 animate-in zoom-in-95">
            <div className="p-3 bg-red-500 rounded-2xl text-white shrink-0">
              <ExclamationCircleIcon className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <p className="text-base sm:text-lg font-black uppercase tracking-tight text-red-400">Atención</p>
              <p className="text-sm text-red-100/70">{error}</p>
            </div>
          </div>
        )}

        {/* ========================================= */}
        {/* DEDICATED IPHONE CAMERA                   */}
        {/* ========================================= */}
        <IPhoneScannerView 
          onScan={addItem} 
          isProcessing={isScanning} 
        />

        {/* List of Scanned Items */}
        <div className="flex-1 flex flex-col space-y-4 pt-4">
          <div className="flex justify-between items-center px-4 shrink-0">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">Lista de Procesamiento</h2>
            {items.length > 0 && (
              <button onClick={clear} className="text-[10px] font-black uppercase tracking-widest text-red-400/80 hover:text-red-400 transition-colors p-2 -mr-2">
                Limpiar todo
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center opacity-30 text-center p-8 border-2 border-dashed border-white/10 rounded-[3rem] min-h-[250px]">
              <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                <BoltIcon className="w-10 h-10" />
              </div>
              <p className="text-lg font-black uppercase tracking-widest">Lista vacía</p>
            </div>
          ) : (
            <div className="space-y-3 pb-8">
              {items.map((item) => (
                <div key={item.product.barcode || item.product.id} className="relative bg-white/5 border border-white/5 rounded-[2rem] p-4 flex flex-col sm:flex-row gap-4 sm:items-center transition-all animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 border border-white/10">
                      {item.product.image ? (
                        <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <ArchiveBoxIcon className="w-6 h-6 text-white/20" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-base leading-tight truncate uppercase tracking-tight">{item.product.name}</h3>
                      <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                        SKU: {item.product.barcode || item.product.id} • STOCK: {item.product.stock}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                    <div className="flex items-center gap-1 bg-black/40 p-1.5 rounded-2xl border border-white/5">
                      <button 
                        onClick={() => updateQuantity(item.product.barcode || item.product.id, item.quantity - 1)}
                        className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <MinusIcon className="w-6 h-6" />
                      </button>
                      <span className="w-14 text-center text-xl font-black tabular-nums">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.product.barcode || item.product.id, item.quantity + 1)}
                        className="w-12 h-12 rounded-xl bg-white text-black flex items-center justify-center active:scale-90 transition-transform"
                      >
                        <PlusIcon className="w-6 h-6" />
                      </button>
                    </div>

                    <button 
                      onClick={() => updateQuantity(item.product.barcode || item.product.id, 0)}
                      className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center active:scale-90 transition-all sm:ml-2"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Bar - Sticky Bottom */}
      <div className="sticky bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/90 to-transparent pt-12 z-40 shrink-0">
        <div className="max-w-2xl mx-auto flex gap-3 sm:gap-4">
          {/* Confirm Button Only */}
          <button 
            onClick={confirm}
            disabled={items.length === 0 || isSaving}
            className={`flex-1 h-16 sm:h-20 rounded-[2rem] flex items-center justify-center gap-3 text-sm sm:text-lg font-black uppercase tracking-widest shadow-2xl transition-all border-2 sm:border-4 border-black ${
              isSaving ? "bg-white/10 text-white/50" : 
              items.length === 0 ? "bg-white/5 text-white/20" : 
              isSale ? "bg-red-500 text-white active:bg-red-600" : "bg-emerald-500 text-black active:bg-emerald-600"
            }`}
          >
            {isSaving ? (
              <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {isSale ? <ShoppingCartIcon className="w-5 h-5 sm:w-6 sm:h-6" /> : <ArchiveBoxIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
                Confirmar {isSale ? "Venta" : "Compra"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
