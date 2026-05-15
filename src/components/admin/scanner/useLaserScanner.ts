"use client";

import { useEffect, useRef } from "react";

interface UseLaserScannerOptions {
  onDetected: (code: string) => void;
  enabled?: boolean;
  minLength?: number;
  maxCharIntervalMs?: number;
}

const isEditableElement = (el: EventTarget | null): boolean => {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hasAttribute("data-laser-passthrough")) return false;
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return true;
  if (el.isContentEditable) return true;
  return false;
};

/**
 * Detects input from a physical barcode scanner (HID keyboard-emulating).
 * Heuristic: characters arriving faster than maxCharIntervalMs apart,
 * terminated by Enter, with total length >= minLength.
 * Ignores typing into editable elements unless they opt-in via data-laser-passthrough.
 */
export function useLaserScanner({
  onDetected,
  enabled = true,
  minLength = 4,
  maxCharIntervalMs = 35,
}: UseLaserScannerOptions) {
  const bufferRef = useRef("");
  const lastCharTimeRef = useRef(0);
  const callbackRef = useRef(onDetected);

  useEffect(() => {
    callbackRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditableElement(e.target)) return;

      const now = Date.now();
      const elapsed = now - lastCharTimeRef.current;

      if (e.key === "Enter") {
        const code = bufferRef.current.trim();
        bufferRef.current = "";
        if (code.length >= minLength) {
          e.preventDefault();
          callbackRef.current(code);
        }
        return;
      }

      if (e.key.length === 1) {
        if (elapsed > maxCharIntervalMs) {
          bufferRef.current = e.key;
        } else {
          bufferRef.current += e.key;
        }
        lastCharTimeRef.current = now;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, minLength, maxCharIntervalMs]);
}
