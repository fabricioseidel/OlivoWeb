import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createPasswordResetToken } from '@/server/password-reset.service';
import { sendPasswordResetEmail } from '@/server/email.service';
import { rateLimit, getClientIp } from '@/lib/rate-limit';
import { urlPublica } from '@/lib/site-url';

const schema = z.object({
  email: z.string().email('Correo electrónico inválido'),
});

/** Respuesta única, exista o no la cuenta. */
const GENERIC_OK = {
  message:
    'Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.',
};

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = rateLimit(`forgot-password:${ip}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { message: 'Demasiadas solicitudes. Intenta más tarde.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: 'Correo electrónico inválido' }, { status: 400 });
    }

    const result = await createPasswordResetToken(parsed.data.email);

    // Si el correo no corresponde a ninguna cuenta se responde exactamente lo
    // mismo: de lo contrario el formulario serviría para averiguar qué
    // direcciones están registradas.
    if (!result) {
      return NextResponse.json(GENERIC_OK, { status: 200 });
    }

    // Mismo motivo que en los pagos: el enlace tiene que salir al dominio
    // canónico, no al raíz que redirige.
    const siteUrl = urlPublica();
    const resetUrl = `${siteUrl}/recuperar-password/restablecer?token=${result.token}`;

    try {
      await sendPasswordResetEmail({
        to: result.email,
        customerName: result.userName || 'Hola',
        resetUrl,
      });
    } catch (err) {
      // El token ya está creado; que falle el envío no debe delatar que la
      // cuenta existe, así que se registra y se responde igual.
      console.error('[ForgotPassword] Falló el envío del correo:', err);
    }

    return NextResponse.json(GENERIC_OK, { status: 200 });
  } catch (error) {
    console.error('[ForgotPassword] Error:', error);
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 });
  }
}
