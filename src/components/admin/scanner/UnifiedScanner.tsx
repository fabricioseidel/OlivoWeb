"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  CameraIcon,
  QrCodeIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useBarcodeStream } from "./useBarcodeStream";
import { useLaserScanner } from "./useLaserScanner";
import ZoomTorchOverlay from "./ZoomTorchOverlay";
import type { BarcodeFormat, ScannerSource } from "@/types/scanner";

type Mode = "LASER" | "CAMERA";

interface UnifiedScannerProps {
  onDetected: (code: string, source: ScannerSource, format?: BarcodeFormat) => void;
  isProcessing?: boolean;
  initialMode?: Mode;
  acceptedFormats?: BarcodeFormat[];
  /** Vibrate + flash on every detection. Default true. */
  feedback?: boolean;
  className?: string;
}

/**
 * Single source of truth for barcode scanning across the admin app.
 * Supports a physical laser scanner (HID keyboard) and the device camera with
 * continuous autofocus, dynamic zoom, torch, native BarcodeDetector + fallback.
 */
export default function UnifiedScanner({
  onDetected,
  isProcessing = false,
  initialMode = "LASER",
  acceptedFormats,
  feedback = true,
  className = "",
}: UnifiedScannerProps) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [manualValue, setManualValue] = useState("");
  const [flash, setFlash] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerId = `unified-scanner-${useId().replace(/[:]/g, "")}`;
  const processingRef = useRef(isProcessing);

  useEffect(() => {
    processingRef.current = isProcessing;
  }, [isProcessing]);

  const handle = (code: string, source: ScannerSource, format?: BarcodeFormat) => {
    if (processingRef.current) return;
    if (feedback) {
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      if ("vibrate" in navigator) navigator.vibrate(40);
    }
    onDetected(code, source, format);
  };

  const {
    isStarting,
    isRunning,
    error,
    capabilities,
    zoom,
    setZoom,
    torchOn,
    toggleTorch,
  } = useBarcodeStream({
    videoElementId: containerId,
    onDetected: (code, format) => handle(code, "camera", format),
    enabled: mode === "CAMERA",
    acceptedFormats,
  });

  useLaserScanner({
    onDetected: (code) => handle(code, "laser"),
    enabled: !isProcessing,
  });

  useEffect(() => {
    if (mode === "LASER" && !isProcessing) inputRef.current?.focus();
  }, [mode, isProcessing]);

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualValue.trim();
    if (code.length < 3) return;
    handle(code, "manual");
    setManualValue("");
  };

  return (
    <div
      className={`w-full bg-[#0a0a0a] rounded-[2rem] border border-white/10 overflow-hidden ${className}`}
    >
      <div className="flex bg-[#141414] p-2 gap-1">
        <button
          type="button"
          onClick={() => setMode("LASER")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
            mode === "LASER"
              ? "bg-white text-black"
              : "text-white/40 hover:text-white hover:bg-white/5"
          }`}
        >
          <QrCodeIcon className="w-4 h-4" />
          Pistola
        </button>
        <button
          type="button"
          onClick={() => setMode("CAMERA")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors ${
            mode === "CAMERA"
              ? "bg-emerald-500 text-black"
              : "text-white/40 hover:text-white hover:bg-white/5"
          }`}
        >
          <CameraIcon className="w-4 h-4" />
          Cámara
        </button>
      </div>

      <div className="relative p-4">
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-[2rem]">
            <ArrowPathIcon className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}

        {mode === "LASER" && (
          <form onSubmit={submitManual} className="space-y-3">
            <p className="text-center text-[10px] text-white/40 font-bold uppercase tracking-[0.3em]">
              Apunta y dispara, o escribe el código
            </p>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              data-laser-passthrough
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="000000000000"
              className="w-full text-center text-2xl tracking-[0.3em] font-mono p-4 bg-black border-2 border-white/15 focus:border-emerald-500 rounded-2xl outline-none text-white placeholder:text-white/10"
            />
          </form>
        )}

        {mode === "CAMERA" && (
          <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-emerald-500/30">
            <div id={containerId} className="absolute inset-0" />

            {(isStarting || (!isRunning && !error)) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 z-20">
                <CameraIcon className="w-8 h-8 text-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">
                  Iniciando cámara…
                </span>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/90 p-6 text-center z-20">
                <XMarkIcon className="w-10 h-10 text-red-400" />
                <p className="text-xs text-red-300 font-bold uppercase tracking-widest">
                  {error}
                </p>
              </div>
            )}

            {isRunning && !flash && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="w-3/4 h-[2px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse" />
              </div>
            )}

            {flash && (
              <div className="absolute inset-0 z-40 flex items-center justify-center bg-emerald-500/30 backdrop-blur-sm">
                <CheckCircleIcon className="w-16 h-16 text-emerald-300 drop-shadow-lg" />
              </div>
            )}

            <ZoomTorchOverlay
              capabilities={capabilities}
              zoom={zoom}
              onZoom={setZoom}
              torchOn={torchOn}
              onToggleTorch={toggleTorch}
            />
          </div>
        )}

        {mode === "CAMERA" && (
          <p className="text-center text-[10px] text-white/30 font-bold uppercase tracking-[0.3em] mt-3">
            Encuadra el código • acerca el zoom para los pequeños
          </p>
        )}
      </div>
    </div>
  );
}
