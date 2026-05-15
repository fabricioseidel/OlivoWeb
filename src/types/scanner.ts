export type BarcodeFormat =
  | "code_128"
  | "code_39"
  | "ean_13"
  | "ean_8"
  | "upc_a"
  | "upc_e"
  | "qr_code";

export type ScannerSource = "camera" | "laser" | "manual";

export interface ScannerCapabilities {
  zoom?: { min: number; max: number; step: number };
  torch: boolean;
  focusMode: boolean;
  hasBarcodeDetector: boolean;
}

export interface ScannerEvent {
  code: string;
  source: ScannerSource;
  format?: BarcodeFormat;
}

declare global {
  interface MediaTrackCapabilities {
    zoom?: { min: number; max: number; step: number };
    torch?: boolean;
    focusMode?: string[];
    focusDistance?: { min: number; max: number; step: number };
    pointsOfInterest?: { x: number; y: number }[];
  }
  interface MediaTrackConstraintSet {
    zoom?: number;
    torch?: boolean;
    focusMode?: string;
    focusDistance?: number;
    pointsOfInterest?: { x: number; y: number }[];
  }

  class BarcodeDetector {
    constructor(opts?: { formats: BarcodeFormat[] });
    static getSupportedFormats(): Promise<BarcodeFormat[]>;
    detect(source: CanvasImageSource): Promise<
      Array<{
        rawValue: string;
        format: BarcodeFormat;
        boundingBox: DOMRectReadOnly;
      }>
    >;
  }

  interface Window {
    BarcodeDetector?: typeof BarcodeDetector;
  }
}
