import { NextResponse } from "next/server";

// Simple in-memory rate limiter (dev only). For production use a durable store like Redis.
const WINDOW_MS = 60_000; // 1 min
const MAX_REQ = 5;
let hits: { ts: number; ip: string }[] = [];

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    hits = hits.filter(h => now - h.ts < WINDOW_MS);
    const count = hits.filter(h => h.ip === ip).length;
    if (count >= MAX_REQ) {
      return NextResponse.json({ error: "Demasiados intentos, espera un minuto" }, { status: 429 });
    }
    hits.push({ ts: now, ip });

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
  } catch (e: any) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
