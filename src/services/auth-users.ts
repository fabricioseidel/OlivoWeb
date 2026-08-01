import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/utils/logger";

export type DbUser = {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  role: string | null;
};

/**
 * Lee un usuario de `users` por email, con la service_role key para saltarse
 * RLS. La contraseña vive en `password_hash` (bcrypt); es la columna que
 * escribe `createUser`.
 *
 * El callback `jwt` de NextAuth llama a esto en cada request para re-leer el
 * rol, así que tiene que ser una sola consulta: la versión anterior sondeaba
 * el esquema con tres selects encadenados más dos consultas de diagnóstico, y
 * cada sesión cuyo email ya no estaba en la tabla dejaba un error
 * `column users.password does not exist` en los logs de Postgres por request.
 */
export async function getUserByEmail(email: string): Promise<DbUser | null> {
  const { data, error } = await supabaseServer
    .from("users")
    .select("id, email, password_hash, name, role")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    logger.error("[AUTH-SERVICE] Error al buscar usuario:", error.message);
    return null;
  }

  return (data as DbUser) ?? null;
}
