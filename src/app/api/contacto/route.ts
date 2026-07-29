import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { allowed, retryAfterSeconds } = rateLimit(`contacto:${getClientIp(req)}`, {
      limit: 3,
      windowMs: 10 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Demasiados intentos, espera un momento" },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
    const { name, email, subject, message } = body as Record<string, string>;
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }
    if (!/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    // Aquí podrías enviar correo (e.g. nodemailer) o guardar en DB.
    // Simulación de latencia
    await new Promise(r => setTimeout(r, 300));

    return NextResponse.json({ ok: true });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
