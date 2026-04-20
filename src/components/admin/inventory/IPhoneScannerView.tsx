"use client";

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CameraIcon, CheckCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface IPhoneScannerViewProps {
  onScan: (barcode: string) => void;
  isProcessing?: boolean;
}

export default function IPhoneScannerView({ onScan, isProcessing = false }: IPhoneScannerViewProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const [camStarted, setCamStarted] = useState(false);
  
  // Protocolo Anti-Bucle (Cerradura de Referencia)
  const isLocked = useRef(false);
  const [showSuccessVisual, setShowSuccessVisual] = useState(false);

  // Sincronizar prop con ref
  const isProcessingRef = useRef(false);
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const scanner = new Html5Qrcode("iphone-reader");
    scannerRef.current = scanner;

    const startCamera = async () => {
      try {
        // Estrategia 2: Pedir permisos explicitamente primero obteniendo las cámaras
        const devices = await Html5Qrcode.getCameras();
        
        if (devices && devices.length > 0) {
          // Intentar encontrar la cámara trasera
          const backCamera = devices.find(device => 
            device.label.toLowerCase().includes('back') || 
            device.label.toLowerCase().includes('trasera') ||
            device.label.toLowerCase().includes('environment')
          );
          
          // Si no hay trasera etiquetada claramente, tomamos la última (suele ser la trasera en móviles)
          const cameraId = backCamera ? backCamera.id : devices[devices.length - 1].id;

          await scanner.start(
            cameraId,
            {
              fps: 15,
              // Al usar el ID, dejamos que la cámara decida su mejor resolución por defecto
              // Quitamos el qrbox restrictivo para que escanee todo el frame de video.
              // Esto permite alejar el celular y evitar el problema de enfoque macro.
            },
            (decodedText) => {
              // 1. Bloqueo de Estado Externo (API)
              if (isProcessingRef.current) return;

              // 2. Protocolo Anti-Bucle Interno
              if (isLocked.current) return;

              // Bloquear inmediatamente
              isLocked.current = true;
              setShowSuccessVisual(true);
              
              if ("vibrate" in navigator) navigator.vibrate(50);
              
              // Disparar acción
              onScan(decodedText);

              // Rearmado en 1.2 segundos
              setTimeout(() => {
                isLocked.current = false;
                setShowSuccessVisual(false);
              }, 1200);
            },
            () => {} // Ignorar fotogramas vacíos
          );
          setCamStarted(true);
        } else {
          setCamError("No se encontraron cámaras en el dispositivo.");
        }
      } catch (err: any) {
        console.error("Scanner start error:", err);
        setCamError("Permiso denegado o error de cámara.");
      }
    };

    startCamera();

    // Instrucción de Limpieza
    return () => {
      if (scanner.isScanning) {
        scanner.stop()
          .then(() => scanner.clear())
          .catch(e => console.error("Error crítico al detener cámara", e));
      } else {
        scanner.clear();
      }
    };
  }, [onScan]);

  return (
    <div className="w-full bg-[#000000] rounded-[3rem] overflow-hidden shadow-2xl relative">
      <div className="p-6 relative min-h-[300px] flex flex-col items-center justify-center">
        
        {/* Capa de Bloqueo Visual Externo (isProcessing) */}
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center rounded-[3rem]">
            <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          </div>
        )}

        <div className="w-full animate-in fade-in zoom-in-95 duration-300">
           {/* UI/UX Estilo iOS - Visor Redondeado */}
           <div className={`relative w-full max-w-sm mx-auto bg-black rounded-[3rem] overflow-hidden transition-all duration-300 border-4 ${showSuccessVisual ? 'border-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.3)]' : 'border-emerald-500/30'}`}>
             
             {/* Notificador visual de éxito sobre el video */}
             {showSuccessVisual && (
               <div className="absolute inset-0 z-40 bg-emerald-500/20 flex flex-col items-center justify-center backdrop-blur-sm animate-in fade-in duration-150">
                 <CheckCircleIcon className="w-20 h-20 text-emerald-400 mb-2 drop-shadow-2xl animate-in zoom-in-50" />
                 <span className="text-emerald-300 font-black tracking-widest uppercase text-sm">Escaneado</span>
               </div>
             )}

             <div id="iphone-reader" className="w-full min-h-[300px] object-cover" />
             
             {/* Estados de Carga y Error */}
             {!camStarted && !camError && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-30">
                 <CameraIcon className="w-8 h-8 text-emerald-500 mb-4 animate-pulse" />
                 <span className="text-emerald-500/50 text-[10px] font-black uppercase tracking-widest">Iniciando Lente...</span>
               </div>
             )}
             
             {camError && (
               <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black z-30">
                 <XMarkIcon className="w-12 h-12 text-red-500 mb-2" />
                 <p className="text-red-400 text-xs font-bold uppercase">{camError}</p>
               </div>
             )}
           </div>

           <div className="text-center mt-6">
             <p className="text-xs text-white/30 font-black uppercase tracking-[0.3em]">
               {showSuccessVisual ? "Procesando código..." : "Encuadra el código aquí"}
             </p>
           </div>
        </div>
      </div>
    </div>
  );
}
