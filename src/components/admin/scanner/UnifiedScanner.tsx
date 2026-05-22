"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import {
  CameraIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowPathIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { useBarcodeStream } from "./useBarcodeStream";
import { useLaserScanner } from "./useLaserScanner";
import ZoomTorchOverlay from "./ZoomTorchOverlay";
import CameraPicker from "./CameraPicker";
import type { BarcodeFormat, ScannerSource } from "@/types/scanner";

interface UnifiedScannerProps {
  onDetected: (code: string, source: ScannerSource, format?: BarcodeFormat) => void;
  isProcessing?: boolean;
  /** Kept for backwards compatibility; ignored — camera is always active. */
  initialMode?: "CAMERA" | "LASER";
  acceptedFormats?: BarcodeFormat[];
  /** Vibrate + flash on every detection. Default true. */
  feedback?: boolean;
  className?: string;
}

/**
 * Single source of truth for barcode scanning across the admin app.
 * The rear camera streams continuously with autofocus, zoom and torch;
 * a physical laser scanner (HID keyboard) keeps working in the background
 * without needing a mode toggle. Manual entry is exposed in a collapsible row.
 */
export default function UnifiedScanner({
  onDetected,
  isProcessing = false,
  acceptedFormats,
  feedback = true,
  className = "",
}: UnifiedScannerProps) {
  const [manualValue, setManualValue] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [flash, setFlash] = useState(false);
  const containerId = `unified-scanner-${useId().replace(/[:]/g, "")}`;
  const processingRef = useRef(isProcessing);
  const videoWrapRef = useRef<HTMLDivElement | null>(null);
  const focusPulseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [focusPulse, setFocusPulse] = useState<{ x: number; y: number } | null>(null);

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
    isPermissionError,
    capabilities,
    zoom,
    setZoom,
    torchOn,
    toggleTorch,
    focusAt,
    retry,
    cameras,
    currentCameraId,
    setCamera,
  } = useBarcodeStream({
    videoElementId: containerId,
    onDetected: (code, format) => handle(code, "camera", format),
    enabled: true,
    acceptedFormats,
  });

  useLaserScanner({
    onDetected: (code) => handle(code, "laser"),
    enabled: !isProcessing,
  });

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualValue.trim();
    if (code.length < 3) return;
    handle(code, "manual");
    setManualValue("");
  };

  const handleVideoTap = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = videoWrapRef.current;
    if (!el || !isRunning) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    focusAt(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)));
    setFocusPulse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    if (focusPulseTimeout.current) clearTimeout(focusPulseTimeout.current);
    focusPulseTimeout.current = setTimeout(() => setFocusPulse(null), 700);
  };

  useEffect(() => {
    return () => {
      if (focusPulseTimeout.current) clearTimeout(focusPulseTimeout.current);
    };
  }, []);

  const macroCam = cameras.find((c) => c.kind === "macro");
  const hasMacroSuggestion =
    !!macroCam && currentCameraId !== macroCam.deviceId && isRunning;

  return (
    <div
      className={`w-full bg-[#0a0a0a] rounded-[2rem] border border-white/10 overflow-hidden ${className}`}
    >
      <div className="relative p-4">
        {isProcessing && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-[2rem]">
            <ArrowPathIcon className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}

        <CameraPicker
          cameras={cameras}
          currentCameraId={currentCameraId}
          onPick={setCamera}
        />

        {hasMacroSuggestion && (
          <button
            type="button"
            onClick={() => setCamera(macroCam!.deviceId)}
            className="w-full mb-3 mt-1 px-3 py-2 bg-emerald-500/10 border border-emerald-500/40 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-500/20 active:scale-[0.98] transition-all"
          >
            ¿Código pequeño? Cambia al lente Macro
          </button>
        )}

        <div
          ref={videoWrapRef}
          onPointerDown={handleVideoTap}
          className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-black border border-emerald-500/30 select-none touch-manipulation"
        >
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
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/95 p-6 text-center z-20">
              <XMarkIcon className="w-10 h-10 text-red-400" />
              <p className="text-xs text-red-300 font-bold uppercase tracking-widest leading-relaxed max-w-[260px]">
                {error}
              </p>
              <button
                type="button"
                onClick={retry}
                className="mt-2 px-4 py-2 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 active:scale-95"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Reintentar
              </button>
              {isPermissionError && (
                <p className="text-[9px] text-white/40 font-medium leading-relaxed max-w-[260px]">
                  {/iPhone|iPad|iPod/i.test(
                    typeof navigator !== "undefined" ? navigator.userAgent : ""
                  )
                    ? "En iPhone/iPad: Ajustes → Privacidad → Cámara → activa Safari. O bien Ajustes → Safari → Cámara → Permitir."
                    : "Si la pestaña dice «bloqueado», abre Ajustes del navegador → Permisos del sitio → Cámara → Permitir."}
                </p>
              )}
            </div>
          )}

          {isRunning && !flash && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-[2px] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse" />
            </div>
          )}

          {focusPulse && (
            <div
              className="absolute z-30 w-14 h-14 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-400 pointer-events-none animate-ping"
              style={{ left: focusPulse.x, top: focusPulse.y }}
            />
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

        <div className="flex items-center justify-between gap-3 mt-3 px-1">
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-[0.25em] leading-tight">
            Acerca el código • toca para enfocar
          </p>
          <button
            type="button"
            onClick={() => setShowManual((v) => !v)}
            className="text-[10px] text-white/50 hover:text-white font-black uppercase tracking-widest flex items-center gap-1.5 shrink-0"
          >
            <PencilSquareIcon className="w-3.5 h-3.5" />
            {showManual ? "Cerrar" : "Manual"}
          </button>
        </div>

        {showManual && (
          <form onSubmit={submitManual} className="mt-3">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              data-laser-passthrough
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Escribe o pega un código…"
              className="w-full text-center text-base tracking-[0.2em] font-mono p-3 bg-black border-2 border-white/15 focus:border-emerald-500 rounded-xl outline-none text-white placeholder:text-white/20"
              autoFocus
            />
          </form>
        )}
      </div>
    </div>
  );
}
