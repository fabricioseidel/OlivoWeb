import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/utils/logger";

// POST /api/webhooks/resend — Recibe eventos de Resend (delivered, bounced, etc.)
// Requiere la variable de entorno RESEND_WEBHOOK_SECRET (signing secret del webhook)

type ResendWebhookEvent = {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    from?: string;
    to?: string | string[];
    subject?: string;
    bounce?: { message?: string; subType?: string; type?: string };
    failed?: { reason?: string };
    [key: string]: unknown;
  };
};

// Mapeo de evento Resend → status en email_log
const STATUS_BY_EVENT: Record<string, string> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.opened": "opened",
  "email.clicked": "clicked",
};

// Estados que no deben ser pisados por eventos que llegan después fuera de orden
const TERMINAL_STATUSES = new Set(["bounced", "complained", "failed", "clicked"]);

// Escapa comodines de LIKE para que ilike compare el email literal (case-insensitive)
function emailPattern(email: string) {
  return email.replace(/[\\%_]/g, "\\$&");
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    logger.error("[Webhook Resend] RESEND_WEBHOOK_SECRET no configurado");
    return NextResponse.json({ error: "Webhook secret no configurado" }, { status: 500 });
  }

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: ResendWebhookEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(payload, headers) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  const type = event.type;
  const data = event.data ?? {};
  const status = STATUS_BY_EVENT[type];
  const resendId = data.email_id ?? null;
  const rawTo = Array.isArray(data.to) ? data.to[0] : data.to;
  const toEmail = rawTo?.toLowerCase() ?? null;
  const errorMessage =
    type === "email.bounced"
      ? data.bounce?.message ?? "Email rebotado"
      : type === "email.failed"
        ? data.failed?.reason ?? "Envío fallido"
        : null;

  if (!status) {
    // Evento no relevante (ej: contact.*, domain.*) — confirmar recepción sin procesar
    return NextResponse.json({ received: true, ignored: type });
  }

  try {
    const statusUpdate = {
      status,
      ...(errorMessage ? { error_message: errorMessage } : {}),
    };
    // Filtro para no pisar estados terminales con eventos fuera de orden
    // (ej: "delivered" después de "bounced")
    const notTerminal = `(${[...TERMINAL_STATUSES].join(",")})`;

    // Actualizar el registro creado al enviar el correo (email.service.ts guarda
    // resend_id). Update directo por resend_id: idempotente ante reintentos de
    // Resend y sin ventana de carrera entre leer e insertar.
    let updated = false;
    if (resendId) {
      const { data: rows, error } = await supabaseServer
        .from("email_log")
        .update(statusUpdate)
        .eq("resend_id", resendId)
        .not("status", "in", notTerminal)
        .select("id");
      if (error) throw error;
      updated = (rows?.length ?? 0) > 0;
    }

    // Sin registro previo (correo enviado fuera de la app, o ya en estado
    // terminal): upsert apoyado en el índice único de resend_id, para que dos
    // eventos simultáneos del mismo correo no dupliquen filas.
    if (!updated && toEmail) {
      const { data: inserted, error } = await supabaseServer
        .from("email_log")
        .upsert(
          {
            to_email: toEmail,
            from_email: data.from ?? "unknown",
            subject: data.subject ?? "(sin asunto)",
            status,
            resend_id: resendId,
            error_message: errorMessage,
            metadata: { webhook_event: type, created_at: event.created_at },
          },
          { onConflict: "resend_id", ignoreDuplicates: true }
        )
        .select("id");
      if (error) throw error;

      // Conflicto: otro evento insertó la fila entre el update y el upsert.
      // Reintentar el update para no perder el estado de este evento.
      if ((inserted?.length ?? 0) === 0 && resendId) {
        await supabaseServer
          .from("email_log")
          .update(statusUpdate)
          .eq("resend_id", resendId)
          .not("status", "in", notTerminal)
          .select("id");
      }
    }

    if (toEmail) {
      // Rebote o fallo → marcar email del cliente como no válido
      if (type === "email.bounced" || type === "email.failed") {
        await supabaseServer
          .from("customers")
          .update({ email_verified: false })
          .ilike("email", emailPattern(toEmail));

        await supabaseServer
          .from("newsletter_subscribers")
          .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
          .ilike("email", emailPattern(toEmail));
      }

      // Queja de spam → retirar consentimiento de marketing y dar de baja del newsletter
      if (type === "email.complained") {
        await supabaseServer
          .from("customers")
          .update({ marketing_consent: false })
          .ilike("email", emailPattern(toEmail));

        await supabaseServer
          .from("newsletter_subscribers")
          .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
          .ilike("email", emailPattern(toEmail));
      }
    }

    logger.log(`[Webhook Resend] ${type} → ${toEmail ?? resendId ?? "?"}`);
  } catch (e) {
    logger.error("[Webhook Resend] Error procesando evento:", e);
    // Responder 200 igual para que Resend no reintente indefinidamente
  }

  return NextResponse.json({ received: true });
}
