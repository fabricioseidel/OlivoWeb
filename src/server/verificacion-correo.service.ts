/**
 * Confirmación del correo al crear una cuenta.
 *
 * El token se guarda **hasheado**, igual que una contraseña: la tabla `users`
 * se lee desde varios sitios y un token en claro ahí dentro es una llave de
 * sesión esperando a filtrarse. Lo que viaja en el enlace es el original, que
 * no queda escrito en ninguna parte.
 */

import crypto from 'crypto';
import { supabaseServer } from '@/lib/supabase-server';
import { sendEmailVerification } from '@/server/email.service';
import { urlPublica } from '@/lib/site-url';

/** Cuánto vale el enlace. Más corto y molesta; más largo y deja de ser una prueba. */
export const VIGENCIA_HORAS = 24;

function hashear(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Genera un token nuevo, lo guarda hasheado y manda el correo.
 *
 * Devuelve `false` si no se pudo guardar; el correo no se manda en ese caso,
 * para no prometer un enlace que no va a validar.
 */
export async function enviarVerificacion(params: {
  email: string;
  nombre: string;
}): Promise<boolean> {
  const token = crypto.randomBytes(32).toString('hex');

  const { error } = await supabaseServer
    .from('users')
    .update({
      verification_token: hashear(token),
      verification_sent_at: new Date().toISOString(),
    })
    .eq('email', params.email.toLowerCase().trim())
    .is('email_verified_at', null);

  if (error) {
    console.error('[Verificación] No se pudo guardar el token:', error);
    return false;
  }

  const verifyUrl = `${urlPublica()}/api/auth/verificar-correo?token=${token}`;
  await sendEmailVerification({
    to: params.email,
    customerName: params.nombre || 'Cliente',
    verifyUrl,
  });
  return true;
}

export type ResultadoVerificacion = 'ok' | 'invalido' | 'vencido' | 'ya-verificado';

/** Canjea el token del enlace. */
export async function verificarConToken(token: string): Promise<ResultadoVerificacion> {
  const limpio = String(token || '').trim();
  if (!limpio) return 'invalido';

  const { data: usuario } = await supabaseServer
    .from('users')
    .select('id, email_verified_at, verification_sent_at')
    .eq('verification_token', hashear(limpio))
    .maybeSingle();

  if (!usuario) return 'invalido';
  if (usuario.email_verified_at) return 'ya-verificado';

  const enviado = usuario.verification_sent_at
    ? Date.parse(String(usuario.verification_sent_at))
    : NaN;
  const vencido =
    !Number.isFinite(enviado) || Date.now() - enviado > VIGENCIA_HORAS * 60 * 60 * 1000;
  if (vencido) return 'vencido';

  const { error } = await supabaseServer
    .from('users')
    .update({
      email_verified_at: new Date().toISOString(),
      // El token se quema al usarlo: un enlace reenviado o guardado en el
      // historial del navegador no puede volver a servir.
      verification_token: null,
    })
    .eq('id', usuario.id);

  if (error) {
    console.error('[Verificación] No se pudo marcar como verificada:', error);
    return 'invalido';
  }
  return 'ok';
}
