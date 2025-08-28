// src/lib/auth.ts
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
import { getUserByEmail as svcGetUserByEmail, type DbUser } from "@/services/auth-users";

// Requerir admin (usa next-auth server session)
export async function requireAdmin() {
  // Cargar authOptions dinámicamente para evitar import estático circular
  const mod = await import("@/app/api/auth/[...nextauth]/route");
  const authOptions = (mod as any).authOptions;
  const session = await getServerSession(authOptions as any);
  // Si luego quieres forzar rol, acá validamos session.user.role === 'admin'
  return { ok: true, session };
}

// Re-export / wrapper para la función de lectura de usuario (servicios)
export async function getUserByEmail(email: string): Promise<DbUser | null> {
  return svcGetUserByEmail(email);
}

// Crear usuario (hash de contraseña + inserción en tabla `users` en Supabase)
export async function createUser({ name, email, password }: { name: string; email: string; password: string }) {
  // Hash simple; puedes ajustar saltRounds si lo deseas
  const password_hash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert({ email: email.toLowerCase().trim(), name: name || null, password_hash, role: "USER" })
    .select()
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as any;
}
