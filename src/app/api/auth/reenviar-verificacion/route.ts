/**
 * Reenvía el correo de confirmación.
 *
 * Responde lo mismo exista o no la cuenta, y esté o no verificada: si
 * distinguiera, sería una forma de averiguar qué correos están registrados.
 */

import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { supabaseServer } from '@/lib/supabase-server';
import { enviarVerificacion } from '@/server/verificacion-correo.service';

const MISMA_RESPUESTA = {
  message: 'Si esa cuenta existe y está sin confirmar, te enviamos el enlace de nuevo.',
};

export async function POST(request: NextRequest) {
  const { allowed, retryAfterSeconds } = rateLimit(`reenviar-verif:${getClientIp(request)}`, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { message: 'Demasiados intentos. Intenta más tarde.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
    );
  }

  let email = '';
  try {
    email = String((await request.json())?.email || '').toLowerCase().trim();
  } catch {
    return NextResponse.json(MISMA_RESPUESTA);
  }
  if (!email) return NextResponse.json(MISMA_RESPUESTA);

  const { data: usuario } = await supabaseServer
    .from('users')
    .select('name, email_verified_at')
    .eq('email', email)
    .maybeSingle();

  if (usuario && !usuario.email_verified_at) {
    await enviarVerificacion({ email, nombre: usuario.name || 'Cliente' });
  }

  return NextResponse.json(MISMA_RESPUESTA);
}
