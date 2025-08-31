// src/lib/auth.ts
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getUserByEmail as svcGetUserByEmail, type DbUser } from "@/services/auth-users";

// Importar authOptions desde el archivo de configuración
import { authOptions } from "@/config/auth.config";

// Re-export authOptions para que esté disponible en toda la aplicación
export { authOptions };

// Re-export / wrapper para la función de lectura de usuario (servicios)
export async function getUserByEmail(email: string): Promise<DbUser | null> {
  return svcGetUserByEmail(email);
}

// Crear usuario (hash de contraseña + inserción en tabla `users` en Supabase)
export async function createUser({ name, email, password }: { name: string; email: string; password: string }) {
  // Hash simple; puedes ajustar saltRounds si lo deseas
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({ email: email.toLowerCase().trim(), name: name || null, password_hash, role: "USER" })
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as any;
}

// Requerir admin (usa next-auth server session)
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  // Si luego quieres forzar rol, acá validamos session.user.role === 'admin'
  return { ok: true, session };
}
