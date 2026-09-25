import { useState, useEffect, useCallback } from "react";
import type { StoreSettings } from "@/app/api/admin/settings/route";
import { WHATSAPP_PHONE } from "@/config/constants";

// Module-level cache — shared across ALL instances of the hook so the
// network request fires only once per session (or after settings:updated).
let _cache: { data: StoreSettings; ts: number } | null = null;
let _pending: Promise<StoreSettings> | null = null;
const CACHE_TTL = 30_000;

async function _fetchOnce(): Promise<StoreSettings> {
  if (_cache && Date.now() - _cache.ts < CACHE_TTL) {
    console.log("[OLIVO:settings] ✅ CACHE HIT — usando datos en memoria, no se hizo fetch", { age_ms: Date.now() - _cache.ts, ttl_ms: CACHE_TTL });
    return _cache.data;
  }
  if (_pending) {
    console.log("[OLIVO:settings] ⏳ fetch ya en curso — esperando promise compartida");
    return _pending;
  }
  // Endpoint público: /api/admin/settings queda detrás del middleware de auth
  // y los visitantes anónimos recibían 401 (y con eso, los defaults del código).
  console.group("[OLIVO:settings] 🌐 FETCH /api/settings");
  const t0 = Date.now();
  _pending = fetch("/api/settings", { cache: "no-store" })
    .then((r) => {
      if (!r.ok) throw new Error(r.statusText);
      return r.json() as Promise<StoreSettings>;
    })
    .then((data) => {
      _cache = { data, ts: Date.now() };
      _pending = null;
      console.log(`[OLIVO:settings] ✅ OK en ${Date.now() - t0}ms`, { storeName: data.storeName, logoUrl: data.appearance?.logoUrl, blocks: (data.appearance?.blocks ?? []).length + " bloques" });
      console.groupEnd();
      return data;
    })
    .catch((err) => {
      _pending = null;
      console.error("[OLIVO:settings] ❌ Error:", err.message);
      console.groupEnd();
      throw err;
    });
  return _pending;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "OLIVOMARKET",
  storeEmail: "contacto@olivomarket.cl",
  storePhone: WHATSAPP_PHONE,
  currency: "CLP",
  language: "es",
  timezone: "America/Santiago",
  appearance: {
    primaryColor: "#10B981",
    secondaryColor: "#059669",
    accentColor: "#047857",
    logoUrl: undefined,
    enableDarkMode: false,
  },
  shipping: {
    enableShipping: true,
    freeShippingEnabled: false,
    freeShippingMinimum: 30000,
    freeShippingMinimumFlash: 40000,
    localDeliveryEnabled: true,
    localDeliveryFee: 5000,
    localDeliveryTimeDays: 3,
    internationalShippingEnabled: false,
    internationalShippingFee: 15000,
  },
  paymentMethods: {
    creditCard: true,
    debitCard: true,
    paypal: false,
    bankTransfer: true,
    mercadoPago: false,
    crypto: false,
  },
  emailFromName: "OLIVOMARKET",
  emailFromAddress: "noreply@olivomarket.cl",
  // Igual que en el servidor: si no se pudo leer la configuración, la tienda
  // se muestra en vitrina. El servidor rechaza el pedido de todos modos, así
  // que dejar el botón de pagar habilitado solo conseguiría que el cliente
  // llenara el carrito, escribiera su dirección y recién ahí se topara con un
  // error.
  previewMode: true,
};

type UseStoreSettingsReturn = {
  settings: StoreSettings;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Hook para obtener configuraciones de la tienda
 * Se puede usar en cualquier parte de la aplicación (cliente y servidor)
 */
export function useStoreSettings(): UseStoreSettingsReturn {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (typeof process !== "undefined" && (process.env.VITEST || process.env.NODE_ENV === "test")) {
      setSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await _fetchOnce();
      setSettings({ ...DEFAULT_SETTINGS, ...data });
    } catch (err: any) {
      console.error("[useStoreSettings]", err);
      setError(err.message);
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Escuchar eventos globales para refrescar settings desde otras partes de la app
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = () => {
      _cache = null; // invalidar cache para que el próximo fetch sea real
      fetchSettings();
    };
    window.addEventListener("settings:updated", handler as EventListener);
    return () => {
      window.removeEventListener("settings:updated", handler as EventListener);
    };
  }, [fetchSettings]);

  return {
    settings,
    loading,
    error,
    refresh: fetchSettings,
  };
}

/**
 * Hook para obtener solo la configuración de apariencia
 */
export function useAppearanceSettings() {
  const { settings, loading, error, refresh } = useStoreSettings();

  return {
    appearance: settings.appearance || DEFAULT_SETTINGS.appearance,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook para obtener solo la configuración de envíos
 */
export function useShippingSettings() {
  const { settings, loading, error, refresh } = useStoreSettings();

  return {
    shipping: settings.shipping || DEFAULT_SETTINGS.shipping,
    loading,
    error,
    refresh,
  };
}

/**
 * Hook para obtener configuración de redes sociales
 */
export function useSocialMediaSettings() {
  const { settings, loading, error, refresh } = useStoreSettings();

  return {
    socialMedia: settings.socialMedia || {},
    loading,
    error,
    refresh,
  };
}

/**
 * Hook para obtener configuración SEO
 */
export function useSeoSettings() {
  const { settings, loading, error, refresh } = useStoreSettings();

  return {
    seo: {
      title: settings.seoTitle || DEFAULT_SETTINGS.storeName,
      description: settings.seoDescription || "Compra los mejores productos",
      keywords: settings.seoKeywords || "",
      ogImageUrl: settings.ogImageUrl,
      ogImageWidth: settings.ogImageWidth || 1200,
      ogImageHeight: settings.ogImageHeight || 630,
    },
    loading,
    error,
    refresh,
  };
}
