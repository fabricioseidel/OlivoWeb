"use client";

import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CameraIcon, QrCodeIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

interface ScanSelectorProps {
  onScan: (barcode: string) => void;
  isProcessing?: boolean;
}

export default function ScanSelector({ onScan, isProcessing = false }: ScanSelectorProps) {
  // Estado para el selector: 'SCANNER' (Pistola) o 'CAMERA'
  const [mode, setMode] = useState<"SCANNER" | "CAMERA">("SCANNER");

  // =========================================================================
  // LÓGICA MODO ESCÁNER EXTERNO (PISTOLA) - Clon de "Creación Rápida"
  // =========================================================================
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Mantener el input siempre enfocado si estamos en modo SCANNER
  useEffect(() => {
    if (mode === "SCANNER" && !isProcessing) {
      inputRef.current?.focus();
    }
  }, [mode, isProcessing, inputValue]);

  const handleExternalScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue(""); // Limpiar para el siguiente escaneo
    }
  };

  // =========================================================================
  // LÓGICA MODO CÁMARA - Clon exacto de "POSScanner"
  // =========================================================================
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [camStarted, setCamStarted] = useState(false);

  useEffect(() => {
    if (mode !== "CAMERA" || typeof window === "undefined") {
      // Si cambiamos de modo, asegurar que la cámara se apague
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
      return;
    }

    const scanner = new Html5Qrcode("hybrid-reader");
    scannerRef.current = scanner;

    const startCamera = async () => {
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // A diferencia del POS, aquí no cerramos la cámara para permitir escaneo continuo
            // Pero usamos la misma configuración básica de lectura
            onScan(decodedText);
            
            // Pausa visual táctil
            if ("vibrate" in navigator) navigator.vibrate(50);
          },
          () => {} // Silent scan attempts
        );
        setCamStarted(true);
      } catch (err: any) {
        console.error("Scanner start error:", err);
        setCamError("Error al iniciar cámara. Verifica permisos.");
      }
    };

    startCamera();

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(e => console.error("Error stopping scanner", e));
      }
    };
  }, [mode, onScan]);

  // =========================================================================
  // RENDER UI
  // =========================================================================
  return (
    <div className="w-full bg-[#111] rounded-[2rem] border-2 border-white/10 overflow-hidden flex flex-col">
      {/* SWITCH / TOGGLE */}
      <div className="flex bg-[#1a1a1a] p-2">
        <button
          type="button"
          onClick={() => setMode("SCANNER")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
            mode === "SCANNER" 
              ? "bg-white text-black shadow-lg" 
              : "text-white/40 hover:text-white hover:bg-white/5"
          }`}
        >
          <QrCodeIcon className="w-5 h-5" />
          Pistola Láser
        </button>
        <button
          type="button"
          onClick={() => setMode("CAMERA")}
          className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black uppercase tracking-widest transition-all ${
            mode === "CAMERA" 
              ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" 
              : "text-white/40 hover:text-white hover:bg-white/5"
          }`}
        >
          <CameraIcon className="w-5 h-5" />
          Cámara Móvil
        </button>
      </div>

      {/* ÁREA DE ESCANEO */}
      <div className="p-6 relative min-h-[200px] flex flex-col items-center justify-center">
        
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-b-[2rem]">
            <ArrowPathIcon className="w-10 h-10 text-white animate-spin" />
          </div>
        )}

        {mode === "SCANNER" && (
          <div className="w-full max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
            <p className="text-center text-xs text-white/40 font-bold uppercase tracking-widest mb-4">
              Asegúrate de que el cursor esté aquí y dispara:
            </p>
            <form onSubmit={handleExternalScanSubmit}>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="000000000000"
                autoFocus
                className="w-full text-center text-4xl tracking-widest font-mono p-6 bg-black border-4 border-white/20 focus:border-white focus:ring-4 focus:ring-white/10 rounded-2xl outline-none transition-all text-white placeholder:text-white/10"
              />
              <button type="submit" className="hidden">Submit</button>
            </form>
          </div>
        )}

        {mode === "CAMERA" && (
          <div className="w-full animate-in fade-in zoom-in-95 duration-200">
             <div className="relative w-full max-w-md mx-auto bg-black rounded-[2rem] overflow-hidden border-4 border-emerald-500/30">
               <div id="hybrid-reader" className="w-full min-h-[300px]" />
               
               {!camStarted && !camError && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                   <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-emerald-500 mb-2"></div>
                   <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest">Iniciando...</span>
                 </div>
               )}
               {camError && (
                 <div className="absolute inset-0 flex items-center justify-center p-6 text-center bg-black">
                   <p className="text-red-400 text-xs font-bold uppercase">{camError}</p>
                 </div>
               )}
             </div>
             <p className="text-center text-xs text-emerald-500/50 font-bold uppercase tracking-widest mt-4">
               Encuadra el código en el recuadro
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
