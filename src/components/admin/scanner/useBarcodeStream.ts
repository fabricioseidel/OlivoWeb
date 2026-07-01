"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import type { BarcodeFormat, ScannerCapabilities } from "@/types/scanner";

export type CameraKind = "main" | "wide" | "ultrawide" | "macro" | "tele" | "front" | "unknown";

export interface CameraInfo {
  deviceId: string;
  label: string;
  kind: CameraKind;
  /** Position in the device list — useful as a tie-breaker. */
  index: number;
}

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
  cameras: CameraInfo[];
  currentCameraId: string | null;
  setCamera: (deviceId: string) => void;
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

const STORAGE_KEY = "scanner.cameraId.v1";

const isPermissionDenied = (err: unknown): boolean => {
  if (!err) return false;
  const e = err as { name?: string; message?: string };
  return (
    e.name === "NotAllowedError" ||
    e.name === "SecurityError" ||
    /permission|denied|denegad|allow/i.test(e.message || "")
  );
};

const isIOSDevice = (): boolean =>
  typeof navigator !== "undefined" &&
  (/iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

const classifyCamera = (rawLabel: string): CameraKind => {
  const l = rawLabel.toLowerCase();
  if (!l) return "unknown";
  if (/front|frontal|user|selfie/.test(l)) return "front";
  if (/macro/.test(l)) return "macro";
  if (/ultra[\s-]?wide|gran[\s-]?angular|wide[\s-]?angle|0\.5x|fisheye/.test(l)) return "ultrawide";
  if (/tele|2x|3x|5x|10x|periscop/.test(l)) return "tele";
  if (/back|trasera|rear|environment|world|wide|main|principal/.test(l)) return "main";
  return "unknown";
};

const isLikelyBackCamera = (label: string): boolean => {
  const l = label.toLowerCase();
  if (!l) return true; // assume usable when labels are empty (pre-permission)
  if (/front|frontal|user|selfie/.test(l)) return false;
  return true;
};

const FRIENDLY_LABEL: Record<CameraKind, string> = {
  main: "Principal",
  wide: "Gran angular",
  ultrawide: "Ultragran angular",
  macro: "Macro",
  tele: "Tele",
  front: "Frontal",
  unknown: "Cámara",
};

const labelize = (info: { label: string; kind: CameraKind; index: number }) => {
  if (info.kind !== "unknown") return FRIENDLY_LABEL[info.kind];
  // Strip the noisy "camera2 0, facing back" prefix Chrome shows on Android.
  const clean = info.label.replace(/^camera2 \d+,?\s*/i, "").replace(/\s+/g, " ").trim();
  return clean || `Cámara ${info.index + 1}`;
};

/**
 * Pulls frames from the rear camera at high resolution with continuous autofocus,
 * uses the native BarcodeDetector when available and falls back to html5-qrcode.
 * Exposes zoom/torch controls when the device supports them, plus tap-to-focus
 * and a lens picker for multi-camera phones.
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
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [currentCameraId, setCurrentCameraId] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try { return window.localStorage.getItem(STORAGE_KEY); } catch { return null; }
  });

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

  // Re-apply focus constraints after the track is alive. Chrome Android ignores
  // the initial `focusMode` hint inside getUserMedia constraints, and even
  // continuous mode can quietly disengage — so we keep nudging it.
  const applyFocusConstraints = useCallback(async (track: MediaStreamTrack) => {
    const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities;
    const advanced: MediaTrackConstraintSet[] = [];

    const focusModes = Array.isArray(caps.focusMode) ? caps.focusMode : [];
    if (focusModes.includes("continuous")) {
      advanced.push({ focusMode: "continuous" });
    } else if (focusModes.includes("auto")) {
      advanced.push({ focusMode: "auto" });
    }

    if (caps.focusDistance) {
      advanced.push({ focusDistance: caps.focusDistance.min });
    }

    if (advanced.length === 0) return;
    try {
      await track.applyConstraints({ advanced });
    } catch {
      const fmOnly = advanced.filter((c) => c.focusMode);
      if (fmOnly.length) {
        try { await track.applyConstraints({ advanced: fmOnly }); } catch { /* noop */ }
      }
    }
  }, []);

  const refreshCameras = useCallback(async (preferredId?: string | null) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const list: CameraInfo[] = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label,
          kind: classifyCamera(d.label),
          index: i,
        }))
        .filter((c) => isLikelyBackCamera(c.label));
      setCameras(list);

      // If no camera is selected yet, pick a sensible default.
      if (!preferredId && !currentCameraId) {
        const main = list.find((c) => c.kind === "main") ?? list[0];
        if (main) setCurrentCameraId(main.deviceId);
      }
    } catch {
      // enumerateDevices can fail on private contexts; we just skip the picker.
    }
  }, [currentCameraId]);

  const setCamera = useCallback((deviceId: string) => {
    setCurrentCameraId(deviceId);
    try { window.localStorage.setItem(STORAGE_KEY, deviceId); } catch { /* noop */ }
  }, []);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    let cancelled = false;
    let focusHeartbeat: ReturnType<typeof setInterval> | null = null;

    const stop = async () => {
      if (focusHeartbeat !== null) clearInterval(focusHeartbeat);
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

    const buildVideoConstraints = (): MediaTrackConstraints => {
      const base: MediaTrackConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        advanced: [{ focusMode: "continuous" }, { focusMode: "auto" }],
      };
      if (currentCameraId) {
        return { ...base, deviceId: { exact: currentCameraId } };
      }
      return { ...base, facingMode: { ideal: "environment" } };
    };

    const requestStream = async () => {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: buildVideoConstraints(),
          audio: false,
        });
      } catch (err) {
        if (isPermissionDenied(err)) throw err;
        // A specific deviceId may not be available right now — fall back to
        // generic back camera so the user isn't stranded.
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

      await applyFocusConstraints(track);

      const settings = track.getSettings?.() ?? {};
      if (settings.deviceId && settings.deviceId !== currentCameraId) {
        setCurrentCameraId(settings.deviceId);
      }

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
      video.setAttribute("autoplay", "");
      video.autoplay = true;
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
          /* expected when frames have no codes */
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      setIsRunning(true);

      // Heartbeat: re-engage focus every 4 s in case the browser silently
      // dropped continuous mode (we've seen this on Android when the track
      // is throttled by tab visibility transitions).
      focusHeartbeat = setInterval(() => {
        const t = trackRef.current;
        if (t) void applyFocusConstraints(t);
      }, 4000);
    };

    const startFallback = async (container: HTMLElement) => {
      // html5-qrcode pesa ~200KB: solo se carga si el BarcodeDetector nativo
      // no está disponible y se necesita el fallback.
      const { Html5Qrcode } = await import("html5-qrcode");

      container.innerHTML = "";
      const innerId = `${videoElementId}-inner`;
      const inner = document.createElement("div");
      inner.id = innerId;
      inner.style.width = "100%";
      inner.style.height = "100%";
      container.appendChild(inner);

      const makeScanner = () =>
        new Html5Qrcode(innerId, {
          verbose: false,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        });

      const startConfig = { fps: 24, aspectRatio: 1.7777 };

      const startGenericBackCamera = async (sc: Html5Qrcode) => {
        const devices = await Html5Qrcode.getCameras();
        if (!devices.length) throw new Error("No se encontraron cámaras");
        const back =
          devices.find((d) => /back|trasera|environment|rear/i.test(d.label)) ||
          devices[devices.length - 1];
        await sc.start(back.id, startConfig, (decoded) => emit(decoded), () => {});
      };

      let scanner = makeScanner();
      html5Ref.current = scanner;

      if (currentCameraId) {
        try {
          await scanner.start(
            { deviceId: { exact: currentCameraId } },
            startConfig,
            (decoded) => emit(decoded),
            () => {}
          );
        } catch (err) {
          if (isPermissionDenied(err)) throw err;
          // Stored deviceId is stale (iOS resets IDs after clearing Safari data).
          // Re-create the scanner and fall back to generic back-camera start.
          try { await scanner.stop(); } catch { /* noop */ }
          scanner = makeScanner();
          html5Ref.current = scanner;
          await startGenericBackCamera(scanner);
        }
      } else {
        await startGenericBackCamera(scanner);
      }

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

          focusHeartbeat = setInterval(() => {
            const t = trackRef.current;
            if (t) void applyFocusConstraints(t);
          }, 4000);
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

        // Permission is granted now; enumerate cameras (labels are populated).
        void refreshCameras(currentCameraId);
      } catch (err) {
        if (isPermissionDenied(err)) {
          setIsPermissionError(true);
          setError(
            isIOSDevice()
              ? "Permiso de cámara denegado. Ve a Ajustes → Safari → Cámara → «Permitir» y vuelve a intentar."
              : "Permiso de cámara denegado. Toca el candado en la barra de direcciones, activa Cámara y vuelve a intentar."
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
  }, [enabled, videoElementId, acceptedFormats, emit, applyFocusConstraints, retryNonce, currentCameraId, refreshCameras]);

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
    cameras,
    currentCameraId,
    setCamera,
  };
}

export { labelize as labelizeCamera };
