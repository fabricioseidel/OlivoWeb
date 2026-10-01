/**
 * Límite de intentos compartido por todas las instancias (tabla
 * `limite_intentos` + función del mismo nombre).
 *
 * Para lo que protege cuentas y dinero: login, registro, recuperación de
 * contraseña, cupones y creación de pedidos. Lo de bajo riesgo (buscar una
 * dirección) sigue con el límite en memoria de src/lib/rate-limit.ts.
 *
 * Si la base no responde se cae al límite en memoria: un problema del
 * contador no puede dejar a todos los clientes sin poder entrar.
 */

import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";

export type ResultadoLimite = { allowed: boolean; retryAfterSeconds: number };

type Opciones = { limit: number; windowMs: number; soloConsultar?: boolean };

export async function limiteGlobal(clave: string, { limit, windowMs, soloConsultar = false }: Opciones): Promise<ResultadoLimite> {
  try {
    const { data, error } = await supabaseServer.rpc("limite_intentos", {
      p_clave: clave,
      p_limite: limit,
      p_ventana_seg: Math.max(1, Math.round(windowMs / 1000)),
      p_sumar: !soloConsultar,
    });
    if (error) throw error;
    const fila = Array.isArray(data) ? data[0] : data;
    return { allowed: Boolean(fila?.permitido ?? true), retryAfterSeconds: Number(fila?.reintentar_seg ?? 0) };
  } catch {
    if (soloConsultar) return { allowed: true, retryAfterSeconds: 0 };
    return rateLimit(clave, { limit, windowMs });
  }
}

/** Ventana del login: 15 minutos. */
export const VENTANA_LOGIN_MS = 15 * 60 * 1000;
/** Fallos por cuenta antes de bloquearla un rato (frena probar contraseñas). */
export const FALLOS_POR_CORREO = 8;
/** Fallos por IP (frena probar muchas cuentas desde un mismo lugar). */
export const FALLOS_POR_IP = 30;
