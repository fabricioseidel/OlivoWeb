import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { supabaseServer } from '@/lib/supabase-server';

/**
 * Recuperación de contraseña por enlace de un solo uso.
 *
 * Decisiones de seguridad:
 * - En la base se guarda el SHA-256 del token, nunca el token en claro. Quien
 *   consiga leer la tabla no puede usar los enlaces pendientes.
 * - Al pedir un enlace se invalidan los anteriores del mismo usuario, para que
 *   no queden varios vigentes a la vez.
 * - El token vive 1 hora y se marca como usado al consumirlo.
 * - `requestPasswordReset` nunca revela si el correo existe: eso convertiría el
 *   formulario en un detector de cuentas registradas.
 */

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

/** El token viaja en la URL; en la base solo queda su hash. */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export type ResetRequestResult = {
  /** Token en claro, solo cuando hay que enviar el correo. */
  token: string;
  userName: string | null;
  email: string;
};

/**
 * Crea un token si el correo corresponde a una cuenta.
 * Devuelve null cuando no existe: quien llama debe responder igual en ambos
 * casos.
 */
export async function createPasswordResetToken(
  email: string
): Promise<ResetRequestResult | null> {
  const normalized = email.toLowerCase().trim();

  const { data: user, error } = await supabaseServer
    .from('users')
    .select('id, email, name')
    .eq('email', normalized)
    .maybeSingle();

  if (error || !user) return null;

  // Invalidar enlaces anteriores que sigan vigentes.
  await supabaseServer
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('used_at', null);

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  const { error: insertError } = await supabaseServer
    .from('password_reset_tokens')
    .insert({
      user_id: user.id,
      token_hash: hashToken(token),
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error('[PasswordReset] No se pudo guardar el token:', insertError.message);
    return null;
  }

  return { token, userName: user.name ?? null, email: user.email };
}

export type ConsumeResult =
  | { ok: true }
  | { ok: false; reason: 'invalid' | 'expired' | 'used' };

/**
 * Valida el token y, si está vigente, cambia la contraseña y lo marca usado.
 * El cambio de contraseña y el consumo del token ocurren juntos: si la
 * actualización falla, el token no se marca y el enlace sigue sirviendo.
 */
export async function consumePasswordResetToken(
  token: string,
  newPassword: string
): Promise<ConsumeResult> {
  if (!token || typeof token !== 'string') return { ok: false, reason: 'invalid' };

  const { data: row, error } = await supabaseServer
    .from('password_reset_tokens')
    .select('id, user_id, expires_at, used_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (error || !row) return { ok: false, reason: 'invalid' };
  if (row.used_at) return { ok: false, reason: 'used' };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: 'expired' };

  const password_hash = await bcrypt.hash(newPassword, 10);

  const { error: updateError } = await supabaseServer
    .from('users')
    .update({ password_hash, updated_at: new Date().toISOString() })
    .eq('id', row.user_id);

  if (updateError) {
    console.error('[PasswordReset] No se pudo actualizar la contraseña:', updateError.message);
    return { ok: false, reason: 'invalid' };
  }

  await supabaseServer
    .from('password_reset_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id);

  return { ok: true };
}

/** Comprueba si un token sirve, sin consumirlo (para pintar el formulario). */
export async function checkPasswordResetToken(token: string): Promise<ConsumeResult> {
  if (!token) return { ok: false, reason: 'invalid' };

  const { data: row, error } = await supabaseServer
    .from('password_reset_tokens')
    .select('expires_at, used_at')
    .eq('token_hash', hashToken(token))
    .maybeSingle();

  if (error || !row) return { ok: false, reason: 'invalid' };
  if (row.used_at) return { ok: false, reason: 'used' };
  if (new Date(row.expires_at).getTime() < Date.now()) return { ok: false, reason: 'expired' };

  return { ok: true };
}
