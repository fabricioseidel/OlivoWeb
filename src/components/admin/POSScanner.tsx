"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { XMarkIcon, CameraIcon } from "@heroicons/react/24/outline";

interface POSScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function POSScanner({ onScan, onClose }: POSScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStarted, setIsStarted] = useState(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    const start = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            onScan(decodedText);
            onClose();
          },
          () => {} // Silent scan attempts
        );
        setIsStarted(true);
      } catch (err: any) {
        console.error("Scanner start error:", err);
        setError("Error al iniciar cámara. Verifica permisos.");
      }
    };

    start();

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(e => console.error("Error stopping scanner", e));
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
       <div className="relative w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
             <div className="flex items-center gap-2">
                <CameraIcon className="h-5 w-5 text-emerald-500" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Escáner activo</span>
             </div>
             <button onClick={onClose} className="p-2 bg-white/5 rounded-xl hover:bg-red-500 transition-colors">
                <XMarkIcon className="h-5 w-5 text-white" />
             </button>
          </div>
          
          <div className="relative bg-black min-h-[300px]">
            <div id="reader" className="w-full" />
            {!isStarted && !error && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500"></div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                <p className="text-red-400 text-xs font-bold uppercase">{error}</p>
              </div>
            )}
          </div>
          
          <div className="p-6 text-center">
             <p className="text-xs text-slate-400 font-medium tracking-tight">Encuadra el código de barras dentro del recuadro para añadirlo automáticamente.</p>
          </div>
       </div>
    </div>
  );
}
