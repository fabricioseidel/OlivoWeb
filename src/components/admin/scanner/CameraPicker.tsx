"use client";

import React from "react";
import { CameraIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { labelizeCamera, type CameraInfo } from "./useBarcodeStream";

interface CameraPickerProps {
  cameras: CameraInfo[];
  currentCameraId: string | null;
  onPick: (deviceId: string) => void;
}

/**
 * Horizontal pill list of available rear cameras. Lets the user manually pick
 * the right lens (Principal, Macro, Ultragran angular, Tele…) — invaluable on
 * Android where the built-in autofocus often can't read small barcodes with
 * the default wide lens.
 */
export default function CameraPicker({ cameras, currentCameraId, onPick }: CameraPickerProps) {
  if (cameras.length < 2) return null;

  return (
    <div className="flex gap-1.5 overflow-x-auto py-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {cameras.map((cam, i) => {
        const active = cam.deviceId === currentCameraId;
        const isMacro = cam.kind === "macro";
        const label = labelizeCamera({ label: cam.label, kind: cam.kind, index: i });
        return (
          <button
            key={cam.deviceId || `cam-${i}`}
            type="button"
            onClick={() => onPick(cam.deviceId)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
              active
                ? "bg-emerald-500 text-black border-emerald-400"
                : isMacro
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/20"
                : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
          >
            {isMacro ? (
              <SparklesIcon className="w-3.5 h-3.5" />
            ) : (
              <CameraIcon className="w-3.5 h-3.5" />
            )}
            {label}
          </button>
        );
      })}
    </div>
  );
}
