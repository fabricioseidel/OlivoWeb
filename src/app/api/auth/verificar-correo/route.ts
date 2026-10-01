/**
 * Canjea el enlace de confirmación que llega por correo.
 *
 * Responde con una redirección al login y el resultado en la URL, para que la
 * persona vea un mensaje y no un JSON.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verificarConToken } from '@/server/verificacion-correo.service';
import { rutaDeVuelta, urlPublica } from '@/lib/site-url';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') || '';
  const resultado = await verificarConToken(token);
  // Quien se registró desde el checkout vuelve al checkout al iniciar sesión.
  const volver = rutaDeVuelta(request.nextUrl.searchParams.get('volver'));
  const extra = volver ? `&callbackUrl=${encodeURIComponent(volver)}` : '';
  return NextResponse.redirect(`${urlPublica()}/login?verificacion=${resultado}${extra}`);
}
