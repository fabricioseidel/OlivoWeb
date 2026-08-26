import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { supabaseServer } from "@/lib/supabase-server";
import { requireApiAdmin } from "@/lib/api-auth";
import { invalidateStoreStatusCache } from "@/server/store-status.service";
import { mapSettingsRow, FALLBACK_SETTINGS } from "@/lib/settings-shared";
import { RADIO_DESPACHO_KM_DEFAULT } from "@/lib/shipping-policy";

// Tipos movidos a @/lib/settings-shared (re-export para los imports existentes)
export type { StoreSettings, PageBlock } from "@/lib/settings-shared";

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
      return NextResponse.json(FALLBACK_SETTINGS);
    }

    return NextResponse.json(mapSettingsRow(data));
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
    const auth = await requireApiAdmin();
    if (!auth.ok) return auth.response;

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
      blocks: body.appearance?.blocks ?? body.blocks ?? null,
      enable_shipping: body.shipping?.enableShipping ?? true,
      free_shipping_enabled: body.shipping?.freeShippingEnabled ?? false,
      free_shipping_minimum: body.shipping?.freeShippingMinimum ?? null,
      local_delivery_enabled: body.shipping?.localDeliveryEnabled ?? true,
      local_delivery_fee: body.shipping?.localDeliveryFee ?? null,
      local_delivery_time_days: body.shipping?.localDeliveryTimeDays ?? 3,
      international_shipping_enabled: body.shipping?.internationalShippingEnabled ?? false,
      international_shipping_fee: body.shipping?.internationalShippingFee ?? null,
      enable_dynamic_shipping: body.shipping?.enableDynamicShipping ?? false,
      shipping_base_fee: body.shipping?.shippingBaseFee ?? 0,
      shipping_price_per_km: body.shipping?.shippingPricePerKm ?? 0,
      shipping_origin_lat: body.shipping?.shippingOriginLat ?? null,
      shipping_origin_lng: body.shipping?.shippingOriginLng ?? null,
      // La columna es NOT NULL: un radio vacío o 0 desactivaría el reparto
      // entero sin que nadie lo pidiera, así que cae al valor por defecto.
      shipping_max_distance_km:
        Number(body.shipping?.shippingMaxDistanceKm) > 0
          ? Number(body.shipping.shippingMaxDistanceKm)
          : RADIO_DESPACHO_KM_DEFAULT,
      is_high_demand: body.shipping?.isHighDemand ?? false,
      payment_methods: body.paymentMethods ?? {},
      payment_test_mode: body.paymentTestMode ?? true,
      email_from_address: body.emailFromAddress ?? null,
      email_from_name: body.emailFromName ?? null,
      order_confirmation_enabled: body.orderConfirmationEnabled ?? true,
      shipping_confirmation_enabled: body.shippingConfirmationEnabled ?? true,
      order_cancellation_enabled: body.orderCancellationEnabled ?? true,
      customer_signup_welcome_enabled: body.customerSignupWelcomeEnabled ?? true,
      marketing_emails_enabled: body.marketingEmailsEnabled ?? false,
      site_copy: body.siteCopy ?? {},
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
      // Ante un body sin el campo se mantiene la vitrina: abrir la tienda
      // tiene que ser un acto explícito, nunca el efecto de un guardado
      // parcial desde otra pestaña de configuración.
      preview_mode: body.previewMode ?? true,
      preview_message: body.previewMessage ?? null,
      hero_title: body.heroTitle ?? null,
      hero_description: body.heroDescription ?? null,
      updated_at: new Date().toISOString(),
    };

    console.log('[SETTINGS][PATCH] Upserting payload:', payload);

    // Realizar upsert
    try {
      const { error } = await supabaseServer
        .from("settings")
        .upsert([payload], { onConflict: "id" });

      if (error) {
        console.error('[SETTINGS][PATCH] Error updating settings:', error);
        return NextResponse.json(
          { error: error.message || 'Error updating settings' },
          { status: 500 }
        );
      }
    } catch (err: any) {
      console.error('[SETTINGS][PATCH] Unexpected error:', err);
      return NextResponse.json(
        { error: err.message || 'Error updating settings' },
        { status: 500 }
      );
    }

    // El estado comercial se cachea unos segundos en el servidor. Sin esto,
    // abrir la tienda tardaría en surtir efecto justo cuando más se mira.
    invalidateStoreStatusCache();

    return NextResponse.json({ ok: true, message: "Configuración actualizada" });
  } catch (error: any) {
    console.error("[SETTINGS][PATCH]", error);
    return NextResponse.json(
      { error: error.message || "Error updating settings" },
      { status: 500 }
    );
  }
}
