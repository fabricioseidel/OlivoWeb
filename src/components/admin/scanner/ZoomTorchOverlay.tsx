"use client";

import React from "react";
import { BoltIcon, BoltSlashIcon, MagnifyingGlassPlusIcon } from "@heroicons/react/24/outline";
import type { ScannerCapabilities } from "@/types/scanner";

interface ZoomTorchOverlayProps {
  capabilities: ScannerCapabilities;
  zoom: number;
  onZoom: (value: number) => void;
  torchOn: boolean;
  onToggleTorch: () => void;
}

export default function ZoomTorchOverlay({
  capabilities,
  zoom,
  onZoom,
  torchOn,
  onToggleTorch,
}: ZoomTorchOverlayProps) {
  const hasZoom = !!capabilities.zoom;
  const hasTorch = capabilities.torch;

  if (!hasZoom && !hasTorch) return null;

  return (
    <div className="absolute bottom-3 left-3 right-3 z-40 flex items-center gap-3 pointer-events-none">
      {hasZoom && capabilities.zoom && (
        <div className="flex-1 flex items-center gap-2 bg-black/60 backdrop-blur-md rounded-full px-4 py-2 pointer-events-auto">
          <MagnifyingGlassPlusIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          <input
            type="range"
            min={capabilities.zoom.min}
            max={capabilities.zoom.max}
            step={capabilities.zoom.step || 0.1}
            value={zoom}
            onChange={(e) => onZoom(Number(e.target.value))}
            data-laser-passthrough
            className="flex-1 accent-emerald-500 h-1"
            aria-label="Zoom de cámara"
          />
          <span className="text-[10px] font-black text-emerald-300 tabular-nums w-8 text-right">
            {zoom.toFixed(1)}×
          </span>
        </div>
      )}
      {hasTorch && (
        <button
          type="button"
          onClick={onToggleTorch}
          className={`pointer-events-auto p-3 rounded-full backdrop-blur-md transition-colors ${
            torchOn
              ? "bg-amber-400 text-black"
              : "bg-black/60 text-amber-300 hover:bg-black/80"
          }`}
          aria-label={torchOn ? "Apagar linterna" : "Encender linterna"}
        >
          {torchOn ? <BoltIcon className="w-5 h-5" /> : <BoltSlashIcon className="w-5 h-5" />}
        </button>
      )}
    </div>
  );
}
