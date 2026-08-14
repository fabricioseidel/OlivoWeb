import { supabase } from "@/lib/supabase";
import { mapSettingsRow, type StoreSettings } from "@/lib/settings-shared";

/**
 * Lee la configuración de la tienda en el servidor.
 *
 * `useStoreSettings` corre en el cliente: arranca con los valores por defecto
 * del código y recién después trae los reales. En la portada eso hacía que el
 * primer render mostrara el hero por defecto y luego lo reemplazara por el
 * guardado en el panel — un cambio de título visible en cada carga, además de
 * dejar en el HTML inicial un <h1> distinto del que ve el visitante.
 *
 * Leyendo aquí, la página se sirve ya con el contenido correcto.
 */
export async function getStoreSettingsServer(): Promise<StoreSettings | null> {
  try {
    const { data, error } = await supabase
      .from("settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    if (error || !data) return null;
    return mapSettingsRow(data);
  } catch (err) {
    // Si la configuración no se puede leer, la página cae a los valores por
    // defecto del cliente en vez de fallar por completo.
    console.error("[settings.server] No se pudo leer la configuración:", err);
    return null;
  }
}
