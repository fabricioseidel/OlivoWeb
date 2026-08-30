// Tipos y mapeo de la configuración de la tienda (tabla settings).
// Compartido entre /api/admin/settings (lectura/escritura admin)
// y /api/settings (lectura pública para la tienda).

import { DEFAULT_BLOCKS, type PageBlock } from "@/lib/page-blocks";
import type { SiteCopy } from "@/lib/site-copy";
import { RADIO_DESPACHO_KM_DEFAULT } from "@/lib/shipping-policy";

export type { PageBlock };

export type StoreSettings = {
  // General
  storeName?: string;
  storeEmail?: string;
  storePhone?: string;
  storeAddress?: string;
  storeCity?: string;
  storeCountry?: string;
  storePostalCode?: string;

  // Regional
  currency?: string;
  language?: string;
  timezone?: string;

  // Apariencia
  appearance?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
    logoUrl?: string;
    faviconUrl?: string;
    bannerUrl?: string;
    footerBackgroundColor?: string;
    footerTextColor?: string;
    enableDarkMode?: boolean;
    blocks?: PageBlock[];
  };

  // Envíos
  shipping?: {
    enableShipping?: boolean;
    freeShippingEnabled?: boolean;
    freeShippingMinimum?: number;
    /** Mínimo del envío flash. Más alto: ese envío lo cobra Uber. */
    freeShippingMinimumFlash?: number;
    localDeliveryEnabled?: boolean;
    localDeliveryFee?: number;
    localDeliveryTimeDays?: number;
    internationalShippingEnabled?: boolean;
    internationalShippingFee?: number;

    // Configuración Dinámica (Haversine)
    enableDynamicShipping?: boolean;
    shippingBaseFee?: number;
    shippingPricePerKm?: number;
    shippingOriginLat?: number;
    shippingOriginLng?: number;
    /**
     * Radio de reparto propio, en km. Define hasta dónde repartimos y hasta
     * dónde aplica el envío gratis por monto. Antes ese límite era el nombre
     * de la comuna, que depende de cómo escriba la dirección el buscador.
     */
    shippingMaxDistanceKm?: number;

    // Alta Demanda
    isHighDemand?: boolean;
  };

  // Pagos
  paymentMethods?: {
    creditCard?: boolean;
    debitCard?: boolean;
    paypal?: boolean;
    bankTransfer?: boolean;
    mercadoPago?: boolean;
    crypto?: boolean;
  };
  paymentTestMode?: boolean;

  // Emails
  emailFromAddress?: string;
  emailFromName?: string;
  orderConfirmationEnabled?: boolean;
  shippingConfirmationEnabled?: boolean;
  orderCancellationEnabled?: boolean;
  customerSignupWelcomeEnabled?: boolean;
  marketingEmailsEnabled?: boolean;

  /** Overrides de textos del front editables desde el admin. */
  siteCopy?: SiteCopy;

  // Redes Sociales
  socialMedia?: {
    facebook?: string | null;
    instagram?: string | null;
    twitter?: string | null;
    tiktok?: string | null;
    youtube?: string | null;
    linkedin?: string | null;
    whatsapp?: string | null;
  };

  // SEO
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImageUrl?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;

  // Política
  termsUrl?: string;
  privacyUrl?: string;
  returnPolicyUrl?: string;
  faqUrl?: string;
  maintenanceMode?: boolean;
  maintenanceMessage?: string;

  /**
   * Modo vitrina: la tienda se ve completa pero no acepta pedidos ni pagos.
   * Distinto de `maintenanceMode`, que baja el sitio entero.
   */
  previewMode?: boolean;
  previewMessage?: string;

  heroTitle?: string;
  heroDescription?: string;

  updatedAt?: string;
};

// Valores por defecto cuando aún no existe la fila de settings
export const FALLBACK_SETTINGS: StoreSettings = {
  storeName: "OLIVOMARKET",
  currency: "CLP",
  language: "es",
  timezone: "America/Santiago",
  appearance: {
    primaryColor: "#10B981",
    secondaryColor: "#059669",
    accentColor: "#047857",
    logoUrl: undefined,
    enableDarkMode: false,
    blocks: DEFAULT_BLOCKS,
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
    enableDynamicShipping: true,
    shippingBaseFee: 1500,
    shippingPricePerKm: 250,
    shippingOriginLat: -33.4312,
    shippingOriginLng: -70.6166,
    shippingMaxDistanceKm: RADIO_DESPACHO_KM_DEFAULT,
    isHighDemand: false,
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
  // El texto anterior ("Sabor que te conecta con casa" / "Llevamos lo mejor de
  // Venezuela...") describía el 1,7% del catálogo. Encabeza lo que la tienda
  // es; lo venezolano tiene su propia sección más abajo.
  heroTitle: "Tu minimarket en Ñuñoa, con despacho a domicilio",
  heroDescription:
    "Más de 700 productos: abarrotes, bebidas, lácteos, panadería, helados y aseo. Y punto de retiro y envío de encomiendas.",
  // Sin fila de settings la tienda queda en vitrina: se puede mirar, no comprar.
  // Es el estado seguro — abrir se decide en el panel, no por desplegar.
  previewMode: true,
};

// Mapear la fila snake_case de la DB a StoreSettings camelCase
export function mapSettingsRow(data: Record<string, any>): StoreSettings {
  return {
    storeName: data.store_name,
    storeEmail: data.store_email,
    storePhone: data.store_phone,
    storeAddress: data.store_address,
    storeCity: data.store_city,
    storeCountry: data.store_country,
    storePostalCode: data.store_postal_code,
    currency: data.currency,
    language: data.language,
    timezone: data.timezone,
    appearance: {
      primaryColor: data.primary_color,
      secondaryColor: data.secondary_color,
      accentColor: data.accent_color,
      logoUrl: data.logo_url,
      faviconUrl: data.favicon_url,
      bannerUrl: data.banner_url,
      footerBackgroundColor: data.footer_background_color,
      footerTextColor: data.footer_text_color,
      enableDarkMode: data.enable_dark_mode,
      blocks: data.blocks || [],
    },
    shipping: {
      enableShipping: data.enable_shipping,
      freeShippingEnabled: data.free_shipping_enabled,
      freeShippingMinimum: data.free_shipping_minimum,
      freeShippingMinimumFlash: data.free_shipping_minimum_flash,
      localDeliveryEnabled: data.local_delivery_enabled,
      localDeliveryFee: data.local_delivery_fee,
      localDeliveryTimeDays: data.local_delivery_time_days,
      internationalShippingEnabled: data.international_shipping_enabled,
      internationalShippingFee: data.international_shipping_fee,
      enableDynamicShipping: data.enable_dynamic_shipping,
      shippingBaseFee: data.shipping_base_fee,
      shippingPricePerKm: data.shipping_price_per_km,
      shippingOriginLat: data.shipping_origin_lat,
      shippingOriginLng: data.shipping_origin_lng,
      shippingMaxDistanceKm:
        Number(data.shipping_max_distance_km) > 0
          ? Number(data.shipping_max_distance_km)
          : RADIO_DESPACHO_KM_DEFAULT,
      isHighDemand: data.is_high_demand ?? false,
    },
    paymentMethods: data.payment_methods || {},
    paymentTestMode: data.payment_test_mode,
    emailFromAddress: data.email_from_address,
    emailFromName: data.email_from_name,
    orderConfirmationEnabled: data.order_confirmation_enabled,
    shippingConfirmationEnabled: data.shipping_confirmation_enabled,
    orderCancellationEnabled: data.order_cancellation_enabled,
    customerSignupWelcomeEnabled: data.customer_signup_welcome_enabled,
    marketingEmailsEnabled: data.marketing_emails_enabled,
    siteCopy: data.site_copy || {},
    socialMedia: data.social_media || {},
    seoTitle: data.seo_title,
    seoDescription: data.seo_description,
    seoKeywords: data.seo_keywords,
    ogImageUrl: data.og_image_url,
    ogImageWidth: data.og_image_width,
    ogImageHeight: data.og_image_height,
    termsUrl: data.terms_url,
    privacyUrl: data.privacy_url,
    returnPolicyUrl: data.return_policy_url,
    faqUrl: data.faq_url,
    maintenanceMode: data.maintenance_mode,
    maintenanceMessage: data.maintenance_message,
    previewMode: data.preview_mode !== false,
    previewMessage: data.preview_message,
    heroTitle: data.hero_title,
    heroDescription: data.hero_description,
    updatedAt: data.updated_at,
  };
}
