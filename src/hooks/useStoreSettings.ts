import { useState, useEffect, useCallback } from "react";
import type { StoreSettings } from "@/app/api/admin/settings/route";

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "OLIVOMARKET",
  storeEmail: "contacto@olivomarket.cl",
  storePhone: "+56 9 1234 5678",
  currency: "CLP",
  language: "es",
  timezone: "America/Santiago",
  appearance: {
    primaryColor: "#10B981",
    secondaryColor: "#059669",
    accentColor: "#047857",
    logoUrl: "/logo.png",
    enableDarkMode: false,
  },
  shipping: {
    enableShipping: true,
    freeShippingEnabled: false,
    freeShippingMinimum: 50000,
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
  paymentTestMode: true,
  emailFromName: "OLIVOMARKET",
  emailFromAddress: "noreply@olivomarket.cl",
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
    try {
      setLoading(true);
      setError(null);

      // During unit tests (vitest) or in Node where a relative fetch URL is invalid,
      // avoid making a network call. Use defaults instead. This prevents errors like
      // "Failed to parse URL from /api/admin/settings" when running tests.
      if (typeof process !== "undefined" && (process.env.VITEST || process.env.NODE_ENV === "test")) {
        setSettings(DEFAULT_SETTINGS);
        setLoading(false);
        return;
      }

      const response = await fetch("/api/admin/settings", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json.error || response.statusText);
      }

      const data = (await response.json()) as StoreSettings;
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
 * Hook para obtener solo la configuración de pagos
 */
export function usePaymentSettings() {
  const { settings, loading, error, refresh } = useStoreSettings();

  return {
    paymentMethods: settings.paymentMethods || DEFAULT_SETTINGS.paymentMethods,
    paymentTestMode: settings.paymentTestMode ?? DEFAULT_SETTINGS.paymentTestMode,
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
