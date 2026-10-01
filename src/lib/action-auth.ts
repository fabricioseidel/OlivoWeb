/**
 * Control de acceso para server actions ("use server").
 *
 * Una server action es un endpoint POST público: Next la expone con un ID que
 * viaja en el JavaScript del panel, y se puede invocar desde CUALQUIER ruta
 * del sitio, no sólo desde /admin. El middleware sólo cubre /admin y
 * /api/admin, así que no alcanza: cada action tiene que revisar la sesión y
 * el rol por su cuenta, igual que las rutas de /api/admin con requireApiAdmin.
 */

import { getServerSession, type Session } from "next-auth";
import { authOptions } from "@/config/auth.config";

export type RolPanel = "ADMIN" | "SELLER";

export type ResultadoAcceso =
  | { ok: true; session: Session; rol: RolPanel }
  | { ok: false; mensaje: string };

function rolDe(session: Session | null): string {
  const s = session as (Session & { role?: string }) | null;
  return String(s?.user?.role ?? s?.role ?? "").toUpperCase();
}

/** ¿Quien llama tiene sesión y alguno de estos roles? No lanza: responde. */
export async function exigirRol(roles: RolPanel[]): Promise<ResultadoAcceso> {
  let session: Session | null = null;
  try {
    session = await getServerSession(authOptions);
  } catch {
    session = null;
  }
  if (!session?.user) return { ok: false, mensaje: "Tu sesión expiró. Vuelve a iniciar sesión." };
  const rol = rolDe(session);
  if (!roles.includes(rol as RolPanel)) return { ok: false, mensaje: "No tienes permiso para esta acción." };
  return { ok: true, session, rol: rol as RolPanel };
}

export const PERSONAL: RolPanel[] = ["ADMIN", "SELLER"];
export const SOLO_ADMIN: RolPanel[] = ["ADMIN"];
