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
  const toEmail = Array.isArray(data.to) ? data.to[0] : data.to ?? null;
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
    // Buscar el registro creado al enviar el correo (email.service.ts guarda resend_id)
    const existing = resendId
      ? (
          await supabaseServer
            .from("email_log")
            .select("id, status")
            .eq("resend_id", resendId)
            .maybeSingle()
        ).data
      : null;

    if (existing) {
      // No pisar estados terminales con eventos que llegan fuera de orden
      // (ej: "delivered" después de "bounced")
      if (!TERMINAL_STATUSES.has(existing.status)) {
        await supabaseServer
          .from("email_log")
          .update({
            status,
            ...(errorMessage ? { error_message: errorMessage } : {}),
          })
          .eq("id", existing.id);
      }
    } else if (toEmail) {
      // Correo enviado fuera de la app (ej: dashboard de Resend) — registrarlo igual
      await supabaseServer.from("email_log").insert({
        to_email: toEmail,
        from_email: data.from ?? "unknown",
        subject: data.subject ?? "(sin asunto)",
        status,
        resend_id: resendId,
        error_message: errorMessage,
        metadata: { webhook_event: type, created_at: event.created_at },
      });
    }

    if (toEmail) {
      // Rebote o fallo → marcar email del cliente como no válido
      if (type === "email.bounced" || type === "email.failed") {
        await supabaseServer
          .from("customers")
          .update({ email_verified: false })
          .eq("email", toEmail);

        await supabaseServer
          .from("newsletter_subscribers")
          .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
          .eq("email", toEmail);
      }

      // Queja de spam → retirar consentimiento de marketing y dar de baja del newsletter
      if (type === "email.complained") {
        await supabaseServer
          .from("customers")
          .update({ marketing_consent: false })
          .eq("email", toEmail);

        await supabaseServer
          .from("newsletter_subscribers")
          .update({ is_active: false, unsubscribed_at: new Date().toISOString() })
          .eq("email", toEmail);
      }
    }

    logger.log(`[Webhook Resend] ${type} → ${toEmail ?? resendId ?? "?"}`);
  } catch (e) {
    logger.error("[Webhook Resend] Error procesando evento:", e);
    // Responder 200 igual para que Resend no reintente indefinidamente
  }

  return NextResponse.json({ received: true });
}
