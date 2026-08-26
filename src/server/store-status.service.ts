import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/utils/logger";
import {
  STORE_STATUS_FALLBACK,
  toStoreStatus,
  type StoreStatus,
} from "@/lib/store-status";

/**
 * Lee si la tienda acepta pedidos.
 *
 * Se consulta en cada intento de compra, así que se cachea unos segundos: sin
 * eso, cada paso del checkout suma una consulta a `settings` que siempre
 * devuelve lo mismo. La ventana es corta a propósito — al abrir la tienda, el
 * cambio tiene que notarse enseguida, no en el próximo despliegue.
 */
const CACHE_TTL_MS = 15_000;

let cached: { value: StoreStatus; at: number } | null = null;

/** Vacía la caché. La usa el guardado de configuración para que el cambio se vea al instante. */
export function invalidateStoreStatusCache(): void {
  cached = null;
}

export async function getStoreStatus(): Promise<StoreStatus> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.value;

  const { data, error } = await supabaseServer
    .from("settings")
    .select("preview_mode, preview_message")
    .eq("id", true)
    .maybeSingle();

  if (error) {
    // PGRST116 = no hay fila de settings todavía: es una tienda recién
    // instalada, y ahí corresponde el estado por defecto (vitrina), no un
    // error. Cualquier otra cosa sí se registra.
    if (error.code !== "PGRST116") {
      logger.error("[store-status] no se pudo leer settings:", error);
    }
    return STORE_STATUS_FALLBACK;
  }

  const value = data
    ? toStoreStatus({
        previewMode: data.preview_mode,
        previewMessage: data.preview_message,
      })
    : STORE_STATUS_FALLBACK;

  cached = { value, at: Date.now() };
  return value;
}

/**
 * ¿Se puede cobrar en este momento?
 *
 * Devuelve el motivo cuando no, para que la ruta lo pase tal cual al cliente
 * en vez de inventar un mensaje distinto en cada endpoint.
 */
export async function assertOrdersEnabled(): Promise<
  { ok: true } | { ok: false; message: string }
> {
  const status = await getStoreStatus();
  return status.previewMode
    ? { ok: false, message: status.previewMessage }
    : { ok: true };
}
