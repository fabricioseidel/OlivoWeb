import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  consumePasswordResetToken,
  checkPasswordResetToken,
} from '@/server/password-reset.service';
import { rateLimit, getClientIp } from '@/lib/rate-limit';

// Mismo mínimo que el registro, para no pedir en la recuperación algo distinto
// de lo que se exigió al crear la cuenta.
const schema = z.object({
  token: z.string().min(1, 'Falta el token'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

const REASON_MESSAGES: Record<string, string> = {
  invalid: 'El enlace no es válido. Solicita uno nuevo.',
  expired: 'El enlace venció. Solicita uno nuevo.',
  used: 'Este enlace ya se usó. Solicita uno nuevo.',
};

/** Comprueba si el enlace sirve, sin consumirlo, para pintar el formulario. */
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token') || '';
  const result = await checkPasswordResetToken(token);
  if (result.ok) return NextResponse.json({ valid: true });
  return NextResponse.json(
    { valid: false, message: REASON_MESSAGES[result.reason] },
    { status: 400 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const { allowed, retryAfterSeconds } = rateLimit(`reset-password:${ip}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { message: 'Demasiados intentos. Intenta más tarde.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'Datos inválidos';
      return NextResponse.json({ message: msg }, { status: 400 });
    }

    const result = await consumePasswordResetToken(parsed.data.token, parsed.data.password);

    if (!result.ok) {
      return NextResponse.json({ message: REASON_MESSAGES[result.reason] }, { status: 400 });
    }

    return NextResponse.json({ message: 'Contraseña actualizada' }, { status: 200 });
  } catch (error) {
    console.error('[ResetPassword] Error:', error);
    return NextResponse.json({ message: 'Error del servidor' }, { status: 500 });
  }
}
