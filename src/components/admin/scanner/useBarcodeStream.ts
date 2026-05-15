"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import type { BarcodeFormat, ScannerCapabilities } from "@/types/scanner";

interface UseBarcodeStreamOptions {
  videoElementId: string;
  onDetected: (code: string, format?: BarcodeFormat) => void;
  enabled: boolean;
  acceptedFormats?: BarcodeFormat[];
  cooldownMs?: number;
}

interface UseBarcodeStreamResult {
  isStarting: boolean;
  isRunning: boolean;
  error: string | null;
  capabilities: ScannerCapabilities;
  zoom: number;
  setZoom: (value: number) => void;
  torchOn: boolean;
  toggleTorch: () => void;
}

const DEFAULT_FORMATS: BarcodeFormat[] = [
  "ean_13",
  "ean_8",
  "code_128",
  "code_39",
  "upc_a",
  "upc_e",
  "qr_code",
];

const NULL_CAPS: ScannerCapabilities = {
  torch: false,
  focusMode: false,
  hasBarcodeDetector: false,
};

/**
 * Pulls frames from the rear camera at high resolution with continuous autofocus,
 * uses the native BarcodeDetector when available and falls back to html5-qrcode.
 * Exposes zoom/torch controls when the device supports them.
 */
export function useBarcodeStream({
  videoElementId,
  onDetected,
  enabled,
  acceptedFormats = DEFAULT_FORMATS,
  cooldownMs = 1500,
}: UseBarcodeStreamOptions): UseBarcodeStreamResult {
  const [isStarting, setIsStarting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ScannerCapabilities>(NULL_CAPS);
  const [zoom, setZoomState] = useState(1);
  const [torchOn, setTorchOn] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const rafRef = useRef<number | null>(null);
  const html5Ref = useRef<Html5Qrcode | null>(null);
  const lastHitRef = useRef<{ code: string; time: number }>({ code: "", time: 0 });
  const callbackRef = useRef(onDetected);

  useEffect(() => {
    callbackRef.current = onDetected;
  }, [onDetected]);

  const emit = useCallback(
    (code: string, format?: BarcodeFormat) => {
      const now = Date.now();
      const last = lastHitRef.current;
      if (code === last.code && now - last.time < cooldownMs) return;
      lastHitRef.current = { code, time: now };
      callbackRef.current(code, format);
    },
    [cooldownMs]
  );

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let cancelled = false;

    const stop = async () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (html5Ref.current?.isScanning) {
        try { await html5Ref.current.stop(); } catch { /* noop */ }
        try { html5Ref.current.clear(); } catch { /* noop */ }
        html5Ref.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        trackRef.current = null;
      }
      if (videoRef.current && videoRef.current.parentElement) {
        videoRef.current.parentElement.removeChild(videoRef.current);
        videoRef.current = null;
      }
    };

    const startNative = async (container: HTMLElement) => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          advanced: [{ focusMode: "continuous" }],
        },
        audio: false,
      });
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities;
      setCapabilities({
        zoom: caps.zoom,
        torch: !!caps.torch,
        focusMode: Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous"),
        hasBarcodeDetector: true,
      });
      if (caps.zoom) setZoomState(caps.zoom.min || 1);

      const video = document.createElement("video");
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.objectFit = "cover";
      video.srcObject = stream;
      container.innerHTML = "";
      container.appendChild(video);
      await video.play();
      videoRef.current = video;

      const detector = new window.BarcodeDetector!({ formats: acceptedFormats });
      detectorRef.current = detector;

      const tick = async () => {
        if (cancelled || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            emit(codes[0].rawValue, codes[0].format);
          }
        } catch {
          // Detection failures are expected when frames have no codes
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      setIsRunning(true);
    };

    const startFallback = async (container: HTMLElement) => {
      container.innerHTML = "";
      const innerId = `${videoElementId}-inner`;
      const inner = document.createElement("div");
      inner.id = innerId;
      inner.style.width = "100%";
      inner.style.height = "100%";
      container.appendChild(inner);

      const scanner = new Html5Qrcode(innerId, {
        verbose: false,
        experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      });
      html5Ref.current = scanner;

      const devices = await Html5Qrcode.getCameras();
      if (!devices.length) throw new Error("No se encontraron cámaras");
      const back =
        devices.find((d) =>
          /back|trasera|environment|rear/i.test(d.label)
        ) || devices[devices.length - 1];

      await scanner.start(
        back.id,
        { fps: 24, aspectRatio: 1.7777 },
        (decoded) => emit(decoded),
        () => {}
      );

      // Try to read capabilities from the underlying stream once html5-qrcode opens it
      setTimeout(() => {
        const video = container.querySelector("video");
        const stream = (video?.srcObject as MediaStream | null) || null;
        const track = stream?.getVideoTracks()[0] ?? null;
        if (track) {
          trackRef.current = track;
          streamRef.current = stream;
          const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities;
          setCapabilities({
            zoom: caps.zoom,
            torch: !!caps.torch,
            focusMode:
              Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous"),
            hasBarcodeDetector: false,
          });
          if (caps.zoom) setZoomState(caps.zoom.min || 1);
        }
      }, 400);

      setIsRunning(true);
    };

    const start = async () => {
      setIsStarting(true);
      setError(null);
      try {
        const container = document.getElementById(videoElementId);
        if (!container) throw new Error("Contenedor de video no encontrado");
        const hasNative =
          typeof window.BarcodeDetector === "function" &&
          typeof navigator.mediaDevices?.getUserMedia === "function";
        if (hasNative) {
          await startNative(container);
        } else {
          await startFallback(container);
        }
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "No se pudo iniciar la cámara";
        setError(msg);
      } finally {
        setIsStarting(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      setIsRunning(false);
      stop();
    };
  }, [enabled, videoElementId, acceptedFormats, emit]);

  const setZoom = useCallback((value: number) => {
    const track = trackRef.current;
    if (!track) return;
    setZoomState(value);
    track
      .applyConstraints({ advanced: [{ zoom: value }] })
      .catch(() => {});
  }, []);

  const toggleTorch = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    setTorchOn(next);
    track
      .applyConstraints({ advanced: [{ torch: next }] })
      .catch(() => {
        setTorchOn(!next);
      });
  }, [torchOn]);

  return {
    isStarting,
    isRunning,
    error,
    capabilities,
    zoom,
    setZoom,
    torchOn,
    toggleTorch,
  };
}
