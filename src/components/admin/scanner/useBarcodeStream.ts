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
  isPermissionError: boolean;
  capabilities: ScannerCapabilities;
  zoom: number;
  setZoom: (value: number) => void;
  torchOn: boolean;
  toggleTorch: () => void;
  focusAt: (xRatio: number, yRatio: number) => void;
  retry: () => void;
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

const isPermissionDenied = (err: unknown): boolean => {
  if (!err) return false;
  const e = err as { name?: string; message?: string };
  return (
    e.name === "NotAllowedError" ||
    e.name === "SecurityError" ||
    /permission|denied|denegad|allow/i.test(e.message || "")
  );
};

/**
 * Pulls frames from the rear camera at high resolution with continuous autofocus,
 * uses the native BarcodeDetector when available and falls back to html5-qrcode.
 * Exposes zoom/torch controls when the device supports them, plus tap-to-focus.
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
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [capabilities, setCapabilities] = useState<ScannerCapabilities>(NULL_CAPS);
  const [zoom, setZoomState] = useState(1);
  const [torchOn, setTorchOn] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

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

  // Applies the most aggressive focus + macro constraints supported by the track.
  // Critical for reading small barcodes up close (Chrome Android ignores the
  // initial `focusMode` in getUserMedia, so we re-apply here after the track is live).
  const applyFocusConstraints = useCallback(async (track: MediaStreamTrack) => {
    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities;
    const advanced: MediaTrackConstraintSet[] = [];

    const focusModes = Array.isArray(caps.focusMode) ? caps.focusMode : [];
    if (focusModes.includes("continuous")) {
      advanced.push({ focusMode: "continuous" });
    } else if (focusModes.includes("auto")) {
      advanced.push({ focusMode: "auto" });
    }

    // On some Android devices, forcing min focus distance enables macro-style
    // close-up focus that the "continuous" mode otherwise won't engage.
    if (caps.focusDistance) {
      advanced.push({ focusDistance: caps.focusDistance.min });
    }

    if (advanced.length === 0) return;
    try {
      await track.applyConstraints({ advanced });
    } catch {
      // Some constraints (focusDistance especially) are picky — fall back to focusMode only.
      const fmOnly = advanced.filter((c) => c.focusMode);
      if (fmOnly.length) {
        try { await track.applyConstraints({ advanced: fmOnly }); } catch { /* noop */ }
      }
    }
  }, []);

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

    const requestStream = async () => {
      // Try high-res with autofocus hint first; if that fails (some Android cams
      // can't deliver 1080p), retry without resolution constraint.
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            advanced: [
              { focusMode: "continuous" },
              { focusMode: "auto" },
            ],
          },
          audio: false,
        });
      } catch (err) {
        if (isPermissionDenied(err)) throw err;
        return await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      }
    };

    const startNative = async (container: HTMLElement, stream: MediaStream) => {
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      trackRef.current = track;

      // Re-apply focus constraints after the track is alive — this is the
      // actual fix for the close-up blur issue on Chrome Android.
      await applyFocusConstraints(track);

      const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities;
      setCapabilities({
        zoom: caps.zoom,
        torch: !!caps.torch,
        focusMode: Array.isArray(caps.focusMode) && caps.focusMode.length > 0,
        hasBarcodeDetector: true,
      });
      if (caps.zoom) setZoomState(caps.zoom.min || 1);

      const video = document.createElement("video");
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.muted = true;
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

      // Read capabilities + re-apply focus after html5-qrcode opens the stream.
      setTimeout(async () => {
        const video = container.querySelector("video") as HTMLVideoElement | null;
        const stream = (video?.srcObject as MediaStream | null) || null;
        const track = stream?.getVideoTracks()[0] ?? null;
        if (track) {
          trackRef.current = track;
          streamRef.current = stream;
          videoRef.current = video;
          await applyFocusConstraints(track);
          const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities;
          setCapabilities({
            zoom: caps.zoom,
            torch: !!caps.torch,
            focusMode: Array.isArray(caps.focusMode) && caps.focusMode.length > 0,
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
      setIsPermissionError(false);
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Este navegador no soporta acceso a la cámara");
        }
        const container = document.getElementById(videoElementId);
        if (!container) throw new Error("Contenedor de video no encontrado");
        const hasNative = typeof window.BarcodeDetector === "function";

        if (hasNative) {
          const stream = await requestStream();
          if (cancelled) {
            stream.getTracks().forEach((t) => t.stop());
            return;
          }
          await startNative(container, stream);
        } else {
          await startFallback(container);
        }
      } catch (err) {
        if (isPermissionDenied(err)) {
          setIsPermissionError(true);
          setError(
            "Permiso de cámara denegado. Toca el candado en la barra de direcciones, activa Cámara y vuelve a intentar."
          );
        } else {
          const msg = err instanceof Error ? err.message : "No se pudo iniciar la cámara";
          setError(msg);
        }
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
  }, [enabled, videoElementId, acceptedFormats, emit, applyFocusConstraints, retryNonce]);

  const setZoom = useCallback((value: number) => {
    const track = trackRef.current;
    if (!track) return;
    setZoomState(value);
    track.applyConstraints({ advanced: [{ zoom: value }] }).catch(() => {});
  }, []);

  const toggleTorch = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const next = !torchOn;
    setTorchOn(next);
    track.applyConstraints({ advanced: [{ torch: next }] }).catch(() => {
      setTorchOn(!next);
    });
  }, [torchOn]);

  // Single-shot focus on a tapped point (xRatio/yRatio are 0..1 of the video).
  const focusAt = useCallback((xRatio: number, yRatio: number) => {
    const track = trackRef.current;
    if (!track) return;
    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities;
    const focusModes = Array.isArray(caps.focusMode) ? caps.focusMode : [];
    const advanced: MediaTrackConstraintSet[] = [];

    if (caps.pointsOfInterest) {
      advanced.push({ pointsOfInterest: [{ x: xRatio, y: yRatio }] });
    }
    if (focusModes.includes("single-shot")) {
      advanced.push({ focusMode: "single-shot" });
    } else if (focusModes.includes("manual")) {
      advanced.push({ focusMode: "manual" });
    }

    if (advanced.length) {
      track.applyConstraints({ advanced }).catch(() => {});
    }

    // Re-engage continuous focus shortly after to keep tracking.
    setTimeout(() => {
      void applyFocusConstraints(track);
    }, 1500);
  }, [applyFocusConstraints]);

  const retry = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  return {
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
  };
}
