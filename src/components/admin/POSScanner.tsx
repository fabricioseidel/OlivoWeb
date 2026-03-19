"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { XMarkIcon, CameraIcon } from "@heroicons/react/24/outline";

interface POSScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function POSScanner({ onScan, onClose }: POSScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Configuración optimizada para velocidad y tipos de códigos de barras (EAN-13, etc)
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      rememberLastUsedCamera: true,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
    };

    scannerRef.current = new Html5QrcodeScanner("reader", config, false);

    scannerRef.current.render(
      (decodedText) => {
        onScan(decodedText);
        onClose();
      },
      (err) => {
        // Ignorar errores de escaneo (no encontró código en el frame)
        // console.warn(err);
      }
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error("Error clearing scanner", e));
      }
    };
  }, [onScan, onClose]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6">
       <div className="relative w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
             <div className="flex items-center gap-2">
                <CameraIcon className="h-5 w-5 text-emerald-500" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Escáner de Cámara</span>
             </div>
             <button onClick={onClose} className="p-2 bg-white/5 rounded-xl hover:bg-red-500 transition-colors">
                <XMarkIcon className="h-5 w-5 text-white" />
             </button>
          </div>
          
          <div id="reader" className="w-full bg-black min-h-[300px]" />
          
          <div className="p-6 text-center">
             <p className="text-xs text-slate-400 font-medium">Encuadra el código de barras dentro del recuadro para añadirlo automáticamente al carrito.</p>
          </div>
       </div>
       
       <style jsx global>{`
          #reader {
            border: none !important;
          }
          #reader button {
            background: #10b981 !important;
            color: white !important;
            padding: 8px 16px !important;
            border-radius: 12px !important;
            font-weight: 800 !important;
            text-transform: uppercase !important;
            letter-spacing: 0.1em !important;
            border: none !important;
            font-size: 10px !important;
            cursor: pointer !important;
            margin-top: 10px !important;
          }
          #reader img {
            display: none !important;
          }
          #reader__dashboard_section_csr button {
             margin-top: 20px !important;
          }
          #reader__status_span {
             display: none !important;
          }
       `}</style>
    </div>
  );
}
