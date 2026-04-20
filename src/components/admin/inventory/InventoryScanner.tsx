"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { XMarkIcon, CameraIcon, BoltIcon } from "@heroicons/react/24/outline";

interface InventoryScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function InventoryScanner({ onScan, onClose }: InventoryScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const lastScanRef = useRef<{ code: string, time: number }>({ code: "", time: 0 });
  
  // Aislar el callback del render cycle
  const onScanRef = useRef(onScan);
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    // Only browser side
    if (typeof window === "undefined") return;

    const scanner = new Html5Qrcode("inventory-reader");
    scannerRef.current = scanner;

    const startScanner = async () => {
      try {
        await scanner.start(
          { 
             facingMode: "environment",
             // Fase 2: Forzar Auto-focus avanzado en dispositivos compatibles (Android/iOS)
             advanced: [{ focusMode: "continuous" } as any] 
          },
          {
            fps: 10,
            // Eliminado el qrbox: ahora el escáner usa el 100% de la pantalla para máxima velocidad
          },
          (decodedText) => {
            const now = Date.now();
            // Debouncer: 2 segundos de bloqueo para el MISMO código.
            if (lastScanRef.current.code === decodedText && now - lastScanRef.current.time < 2000) {
              return;
            }
            lastScanRef.current = { code: decodedText, time: now };
            
            if ("vibrate" in navigator) navigator.vibrate(100);
            
            // Usar la referencia inmutable para evitar triggers del useEffect
            onScanRef.current(decodedText);
          },
          () => {} // Fallos de lectura silenciosos (esperados en cada frame)
        );
        setIsStarted(true);
      } catch (err: any) {
        console.error("Scanner error:", err);
        setError("Error al iniciar cámara. Permite el acceso o intenta recargar la página.");
      }
    };

    startScanner();

    // Fase 3: Limpieza asíncrona segura para evitar bloqueos de hardware en Xiaomi
    return () => {
      if (scanner.isScanning) {
        scanner.stop()
          .then(() => scanner.clear())
          .catch(e => console.error("Error crítico al detener cámara", e));
      } else {
        scanner.clear();
      }
    };
  }, []); // Dependencias vacías: Inicialización 100% aislada.

  return (
    <div className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center">
       <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-emerald-500 rounded-lg animate-pulse">
                <BoltIcon className="w-5 h-5 text-white" />
             </div>
             <span className="text-white font-black uppercase tracking-widest text-sm">Escáner Activo</span>
          </div>
          <button 
            onClick={onClose} 
            className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white active:bg-red-500 transition-colors"
          >
             <XMarkIcon className="w-6 h-6" />
          </button>
       </div>
       
       {/* Removed object-cover to prevent coordinate mapping issues */}
       <div id="inventory-reader" className="w-full h-full flex items-center justify-center overflow-hidden [&>video]:max-w-full [&>video]:max-h-full" />
       
       {!isStarted && !error && (
         <div className="absolute inset-0 flex flex-col items-center justify-center text-white gap-4">
            <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-xs font-bold uppercase tracking-widest opacity-50">Iniciando Cámara...</p>
         </div>
       )}

       {error && (
         <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
               <XMarkIcon className="w-10 h-10 text-red-500" />
            </div>
            <p className="text-white font-bold text-lg mb-2">Acceso Denegado</p>
            <p className="text-gray-400 text-sm mb-8">{error}</p>
            <button onClick={onClose} className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs">
               Cerrar y Usar Manual
            </button>
         </div>
       )}

       {/* Guidance Overlay */}
       {isStarted && (
         <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-32 border-2 border-emerald-500/50 rounded-3xl relative">
               <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl" />
               <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl" />
               <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl" />
               <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-xl" />
            </div>
            <p className="absolute bottom-32 text-white/50 text-[10px] font-black uppercase tracking-[0.2em]">
               Alinea el código de barras
            </p>
         </div>
       )}
    </div>
  );
}
