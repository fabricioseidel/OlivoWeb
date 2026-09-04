import { NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { BUSINESS } from "@/lib/seo/business";
import { sendEmail } from "@/server/email.service";

/** Evita que el contenido del mensaje se interprete como HTML en el correo. */
function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cuerpoDelCorreo(datos: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const fila = (etiqueta: string, valor: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${etiqueta}</td>` +
    `<td style="padding:6px 0;color:#111827">${escaparHtml(valor)}</td></tr>`;

  return `
    <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:640px">
      <h2 style="margin:0 0 4px;color:#111827">Mensaje desde el formulario de contacto</h2>
      <p style="margin:0 0 16px;color:#6b7280;font-size:14px">Respondé a este correo y le llega directo a la persona.</p>
      <table style="border-collapse:collapse;font-size:14px">
        ${fila("Nombre", datos.name)}
        ${fila("Email", datos.email)}
        ${fila("Asunto", datos.subject)}
      </table>
      <div style="margin-top:16px;padding:16px;background:#f9fafb;border-radius:12px;white-space:pre-wrap;font-size:14px;color:#111827">${escaparHtml(
        datos.message
      )}</div>
    </div>
  `;
}

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

    // Antes esta ruta esperaba 300 ms y devolvía { ok: true }. El formulario
    // decía "Mensaje enviado" y el mensaje no salía de ninguna parte: todo lo
    // que escribió un cliente por acá se perdió. Ahora se manda al correo del
    // local, con `replyTo` apuntando al cliente para poder contestarle.
    const resultado = await sendEmail({
      to: BUSINESS.email,
      subject: `[Contacto web] ${subject.slice(0, 120)}`,
      html: cuerpoDelCorreo({ name, email, subject, message }),
      replyTo: email,
      templateSlug: "contacto-web",
      metadata: { origen: "formulario-contacto", nombre: name, email },
    });

    if (!resultado.ok) {
      // No se le confirma un envío que no ocurrió: quien escribe tiene que
      // saber que le conviene usar WhatsApp.
      console.error("[contacto] no se pudo enviar:", resultado.error);
      return NextResponse.json(
        {
          error:
            "No pudimos enviar tu mensaje. Escríbenos por WhatsApp y te respondemos al tiro.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[contacto] error inesperado:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
