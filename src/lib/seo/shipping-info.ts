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
  /**
   * Radio máximo de reparto configurado por el admin, en km de recorrido.
   *
   * Lo necesita el mapa de cobertura: dibujaba el valor de fábrica mientras el
   * checkout validaba contra este, así que si el admin lo cambiaba el mapa
   * quedaba prometiendo una zona distinta a la que el checkout acepta.
   */
  maxDistanceKm: number | null;
  localDeliveryFee: number | null;
  localDeliveryTimeDays: number | null;
};

export const getShippingInfo = unstable_cache(
  async (): Promise<ShippingInfo> => {
    const { data } = await supabase
      .from("settings")
      .select(
        "shipping_base_fee, shipping_price_per_km, free_shipping_minimum, free_shipping_enabled, enable_dynamic_shipping, shipping_max_distance_km, local_delivery_fee, local_delivery_time_days"
      )
      .eq("id", true)
      .single();

    return {
      baseFee: data?.shipping_base_fee ?? null,
      pricePerKm: data?.shipping_price_per_km ?? null,
      freeShippingMinimum: data?.free_shipping_minimum ?? null,
      freeShippingEnabled: Boolean(data?.free_shipping_enabled),
      dynamicEnabled: Boolean(data?.enable_dynamic_shipping),
      maxDistanceKm: data?.shipping_max_distance_km ?? null,
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
