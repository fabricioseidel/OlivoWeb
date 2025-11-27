import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Type para la configuración completa
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
  };

  // Envíos
  shipping?: {
    enableShipping?: boolean;
    freeShippingEnabled?: boolean;
    freeShippingMinimum?: number;
    localDeliveryEnabled?: boolean;
    localDeliveryFee?: number;
    localDeliveryTimeDays?: number;
    internationalShippingEnabled?: boolean;
    internationalShippingFee?: number;
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

  updatedAt?: string;
};

// GET: Obtener todas las configuraciones
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", true)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Si no existe, retornar valores por defecto
    if (!data) {
      return NextResponse.json({
        storeName: "OLIVOMARKET",
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
      } as StoreSettings);
    }

    // Mapear snake_case de DB a camelCase para la respuesta
    const settings: StoreSettings = {
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
      },
      shipping: {
        enableShipping: data.enable_shipping,
        freeShippingEnabled: data.free_shipping_enabled,
        freeShippingMinimum: data.free_shipping_minimum,
        localDeliveryEnabled: data.local_delivery_enabled,
        localDeliveryFee: data.local_delivery_fee,
        localDeliveryTimeDays: data.local_delivery_time_days,
        internationalShippingEnabled: data.international_shipping_enabled,
        internationalShippingFee: data.international_shipping_fee,
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
      updatedAt: data.updated_at,
    };

    return NextResponse.json(settings);
  } catch (error: any) {
    console.error("[SETTINGS][GET]", error);
    return NextResponse.json(
      { error: "Error fetching settings" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar configuraciones (solo admin)
export async function PATCH(req: Request) {
  try {
    // Verificar que el usuario es admin
    const session: any = await getServerSession(authOptions as any);
    const role = session?.role || session?.user?.role || "";

    if (!session || !String(role).toUpperCase().includes("ADMIN")) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Mapear camelCase recibido a snake_case para la DB
    const payload: Record<string, any> = {
      id: true,
      store_name: body.storeName ?? null,
      store_email: body.storeEmail ?? null,
      store_phone: body.storePhone ?? null,
      store_address: body.storeAddress ?? null,
      store_city: body.storeCity ?? null,
      store_country: body.storeCountry ?? null,
      store_postal_code: body.storePostalCode ?? null,
      currency: body.currency ?? null,
      language: body.language ?? null,
      timezone: body.timezone ?? null,
      primary_color: body.appearance?.primaryColor ?? body.primaryColor ?? null,
      secondary_color: body.appearance?.secondaryColor ?? body.secondaryColor ?? null,
      accent_color: body.appearance?.accentColor ?? body.accentColor ?? null,
      logo_url: body.appearance?.logoUrl ?? body.logoUrl ?? null,
      favicon_url: body.appearance?.faviconUrl ?? body.faviconUrl ?? null,
      banner_url: body.appearance?.bannerUrl ?? body.bannerUrl ?? null,
      footer_background_color: body.appearance?.footerBackgroundColor ?? null,
      footer_text_color: body.appearance?.footerTextColor ?? null,
      enable_dark_mode: body.appearance?.enableDarkMode ?? false,
      enable_shipping: body.shipping?.enableShipping ?? true,
      free_shipping_enabled: body.shipping?.freeShippingEnabled ?? false,
      free_shipping_minimum: body.shipping?.freeShippingMinimum ?? null,
      local_delivery_enabled: body.shipping?.localDeliveryEnabled ?? true,
      local_delivery_fee: body.shipping?.localDeliveryFee ?? null,
      local_delivery_time_days: body.shipping?.localDeliveryTimeDays ?? 3,
      international_shipping_enabled: body.shipping?.internationalShippingEnabled ?? false,
      international_shipping_fee: body.shipping?.internationalShippingFee ?? null,
      payment_methods: body.paymentMethods ?? {},
      payment_test_mode: body.paymentTestMode ?? true,
      email_from_address: body.emailFromAddress ?? null,
      email_from_name: body.emailFromName ?? null,
      order_confirmation_enabled: body.orderConfirmationEnabled ?? true,
      shipping_confirmation_enabled: body.shippingConfirmationEnabled ?? true,
      order_cancellation_enabled: body.orderCancellationEnabled ?? true,
      customer_signup_welcome_enabled: body.customerSignupWelcomeEnabled ?? true,
      marketing_emails_enabled: body.marketingEmailsEnabled ?? false,
      social_media: body.socialMedia ?? {},
      seo_title: body.seoTitle ?? null,
      seo_description: body.seoDescription ?? null,
      seo_keywords: body.seoKeywords ?? null,
      og_image_url: body.ogImageUrl ?? null,
      og_image_width: body.ogImageWidth ?? 1200,
      og_image_height: body.ogImageHeight ?? 630,
      terms_url: body.termsUrl ?? null,
      privacy_url: body.privacyUrl ?? null,
      return_policy_url: body.returnPolicyUrl ?? null,
      faq_url: body.faqUrl ?? null,
      maintenance_mode: body.maintenanceMode ?? false,
      maintenance_message: body.maintenanceMessage ?? null,
      updated_at: new Date().toISOString(),
    };

    // Intentar upsert normal
    try {
      const { error } = await supabaseAdmin
        .from("settings")
        .upsert([payload], { onConflict: "id" });

      if (error) throw error;
    } catch (err: any) {
      console.warn('[SETTINGS][PATCH] upsert error, intentando fallback:', err.message || err);

      // Si PostgREST no reconoce alguna columna (PGRST204), intentamos un fallback
      if (String(err.code || '').toUpperCase() === 'PGRST204' || String(err.message || '').includes('Could not find')) {
        try {
          // Intentar obtener una fila existente para conocer las columnas disponibles
          const { data: existingRow, error: fetchErr } = await supabase
            .from('settings')
            .select('*')
            .limit(1)
            .maybeSingle();

          if (fetchErr) {
            console.warn('[SETTINGS][PATCH] no se pudo leer fila existente:', fetchErr.message || fetchErr);
          }

          // Si tenemos una fila existente, filtrar payload para enviar solo keys existentes
          let filteredPayload: Record<string, any> = { id: true };
          if (existingRow && typeof existingRow === 'object') {
            const allowed = new Set(Object.keys(existingRow));
            for (const k of Object.keys(payload)) {
              if (allowed.has(k)) filteredPayload[k] = payload[k];
            }
          } else {
            // Si no hay fila existente, usar un payload mínimo compatible
            filteredPayload = {
              id: true,
              store_name: payload.store_name ?? null,
              currency: payload.currency ?? null,
              logo_url: payload.logo_url ?? null,
              updated_at: payload.updated_at,
            };
          }

          const { error: retryErr } = await supabaseAdmin
            .from('settings')
            .upsert([filteredPayload], { onConflict: 'id' });

          if (retryErr) {
            console.error('[SETTINGS][PATCH] fallback upsert failed:', retryErr);
            return NextResponse.json({
              error: 'Error guardando configuración. Ejecuta la migración SQL para actualizar la tabla `settings` y reintenta. Detalle: ' + (retryErr.message || retryErr),
            }, { status: 500 });
          }
        } catch (fallbackErr: any) {
          console.error('[SETTINGS][PATCH] fallback error:', fallbackErr);
          return NextResponse.json({ error: 'Error guardando configuración en fallback. Ejecuta la migración SQL.' }, { status: 500 });
        }
      } else {
        console.error('[SETTINGS][PATCH]', err);
        return NextResponse.json(
          { error: err.message || 'Error updating settings' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, message: "Configuración actualizada" });
  } catch (error: any) {
    console.error("[SETTINGS][PATCH]", error);
    return NextResponse.json(
      { error: error.message || "Error updating settings" },
      { status: 500 }
    );
  }
}
