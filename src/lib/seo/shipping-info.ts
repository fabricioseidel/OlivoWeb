import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";

/**
 * Lee la configuración real de despacho desde la tabla settings.
 *
 * Las landings de comuna muestran tarifas: si se hardcodearan, quedarían
 * desincronizadas con lo que cobra el checkout apenas el admin cambie un valor.
 * Publicar un precio que no se respeta al pagar es peor que no publicarlo.
 */
export type ShippingInfo = {
  baseFee: number | null;
  pricePerKm: number | null;
  freeShippingMinimum: number | null;
  freeShippingEnabled: boolean;
  dynamicEnabled: boolean;
  localDeliveryFee: number | null;
  localDeliveryTimeDays: number | null;
};

export const getShippingInfo = unstable_cache(
  async (): Promise<ShippingInfo> => {
    const { data } = await supabase
      .from("settings")
      .select(
        "shipping_base_fee, shipping_price_per_km, free_shipping_minimum, free_shipping_enabled, enable_dynamic_shipping, local_delivery_fee, local_delivery_time_days"
      )
      .eq("id", true)
      .single();

    return {
      baseFee: data?.shipping_base_fee ?? null,
      pricePerKm: data?.shipping_price_per_km ?? null,
      freeShippingMinimum: data?.free_shipping_minimum ?? null,
      freeShippingEnabled: Boolean(data?.free_shipping_enabled),
      dynamicEnabled: Boolean(data?.enable_dynamic_shipping),
      localDeliveryFee: data?.local_delivery_fee ?? null,
      localDeliveryTimeDays: data?.local_delivery_time_days ?? null,
    };
  },
  ["seo-shipping-info"],
  { revalidate: 300 }
);

export function formatCLP(value: number): string {
  return `$${Math.round(value).toLocaleString("es-CL")}`;
}
