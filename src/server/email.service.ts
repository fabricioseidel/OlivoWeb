import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";
import { logger } from "@/utils/logger";
import { whatsappLink, normalizeWhatsAppPhone } from "@/utils/whatsapp";

// ── Lazy-initialized Resend client ───────────────────────────────────────
let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY || "missing_api_key_for_build");
  }
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const FROM_NAME = process.env.RESEND_FROM_NAME || "OlivoMarket";
const DEFAULT_WHATSAPP_PHONE = process.env.NEXT_PUBLIC_STORE_WHATSAPP || process.env.STORE_WHATSAPP_PHONE || "56984527980";

function resolveWhatsAppLink(phone?: string | null, message = "Hola OlivoMarket! Tengo una consulta sobre mi pedido."): string {
  const target = normalizeWhatsAppPhone(phone) || normalizeWhatsAppPhone(DEFAULT_WHATSAPP_PHONE) || "56984527980";
  return whatsappLink(target, message);
}

// ── Types ───────────────────────────────────────────────────────────────
export type EmailPayload = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  templateSlug?: string;
  metadata?: Record<string, unknown>;
};

export type EmailResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

// ── Main send function ──────────────────────────────────────────────────
export async function sendEmail(payload: EmailPayload): Promise<EmailResult> {
  const { to, toName, subject, html, templateSlug, metadata } = payload;

  try {
    const { data, error } = await getResend().emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    });

    if (error) {
      logger.error("[Email] Resend error:", error);
      await logEmail({
        to,
        toName,
        subject,
        templateSlug,
        status: "failed",
        errorMessage: error.message,
        metadata,
      });
      return { ok: false, error: error.message };
    }

    const resendId = data?.id || "";
    logger.log(`[Email] ✅ Sent to ${to} — ID: ${resendId}`);

    await logEmail({
      to,
      toName,
      subject,
      templateSlug,
      status: "sent",
      resendId,
      metadata,
    });

    return { ok: true, id: resendId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("[Email] 🔥 Critical error:", message);

    await logEmail({
      to,
      toName,
      subject,
      templateSlug,
      status: "failed",
      errorMessage: message,
      metadata,
    });

    return { ok: false, error: message };
  }
}

// ── Template rendering ──────────────────────────────────────────────────
export function renderTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    result = result.replace(regex, String(value));
  }
  return result;
}

/** Fetch template from DB or return fallback */
export async function getTemplate(slug: string, fallbackSubject: string, fallbackHtml: string) {
  try {
    const { data, error } = await supabaseServer
      .from("email_templates")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (error || !data) {
      logger.warn(`[Email] Template slug "${slug}" not found in DB. Using fallback.`);
      return { subject: fallbackSubject, html: fallbackHtml };
    }

    const row = data as Record<string, any>;
    const html = row.body_html || row.html_body || row.content || fallbackHtml;
    const subject = row.subject || fallbackSubject;

    return { subject, html };
  } catch (err) {
    logger.error(`[Email] Error fetching template "${slug}":`, err);
    return { subject: fallbackSubject, html: fallbackHtml };
  }
}

// ═══════════════════════════════════════════════════════════════════════
// INLINE TEMPLATES (HTML emails)
// ═══════════════════════════════════════════════════════════════════════

const BASE_STYLES = `
  body { margin:0; padding:0; background-color:#f4f7f6; font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; -webkit-font-smoothing:antialiased; }
  .container { max-width:600px; margin:20px auto; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 10px 30px rgba(0,0,0,0.05); }
  .header { background: linear-gradient(135deg, #064E3B 0%, #059669 100%); padding:40px 20px; text-align:center; color:#ffffff; }
  .content { padding:40px 30px; color:#374151; line-height:1.6; }
  .footer { background-color:#f9fafb; padding:30px 20px; text-align:center; border-top:1px solid #edf2f7; }
  .button { display:inline-block; padding:16px 32px; background-color:#10B981; color:#ffffff; text-decoration:none; border-radius:12px; font-weight:bold; font-size:16px; margin:20px 0; box-shadow:0 4px 14px rgba(16,185,129,0.3); }
  .social-link { display:inline-block; margin:0 10px; color:#9CA3AF; text-decoration:none; font-size:12px; border:1px solid #e5e7eb; padding:8px 12px; border-radius:8px; }
  .divider { height:1px; background-color:#edf2f7; margin:30px 0; }
  @media only screen and (max-width: 600px) {
    .container { margin:0; border-radius:0; width:100% !important; }
    .content { padding:30px 20px; }
  }
`;

const ORDER_CONFIRMATION_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header">
    <div style="background:rgba(255,255,255,0.2); padding:6px 14px; border-radius:100px; display:inline-block; font-size:12px; font-weight:bold; margin-bottom:15px;">ORDEN CONFIRMADA</div>
    <h1 style="margin:0; font-size:28px; letter-spacing:-1px;">¡Gracias por tu pedido!</h1>
  </div>
  <div class="content">
    <p style="font-size:18px; font-weight:bold; color:#111827;">Hola {{customerName}},</p>
    <p>Estamos procesando tu orden <strong>#{{orderId}}</strong>. Te avisaremos apenas vaya camino a tu casa.</p>
    
    <div style="margin:30px 0; border:1px solid #edf2f7; border-radius:16px; overflow:hidden;">
      <table style="width:100%; border-collapse:collapse;">
        <thead style="background-color:#f9fafb;">
          <tr>
            <th style="padding:15px; text-align:left; font-size:12px; color:#6b7280; text-transform:uppercase;">Resumen</th>
            <th style="padding:15px; text-align:right; font-size:12px; color:#6b7280; text-transform:uppercase;">Total</th>
          </tr>
        </thead>
        <tbody>{{itemsTable}}</tbody>
      </table>
    </div>

    <div style="background-color:#f0fdf4; padding:25px; border-radius:16px; text-align:center; border:1px dashed #10B981;">
      <p style="margin:0; font-size:13px; color:#065F46; font-weight:bold; text-transform:uppercase;">Total Pagado</p>
      <p style="margin:5px 0 0; font-size:36px; font-weight:900; color:#064E3B;">{{total}}</p>
      <p style="margin:10px 0 0; font-size:12px; color:#059669;">Vía {{paymentMethod}}</p>
    </div>

    {{pointsBlock}}

    <div class="divider"></div>

    <div style="background-color:#fffbeb; padding:20px; border-radius:16px; text-align:center;">
      <p style="margin:0; font-size:14px; font-weight:bold; color:#92400E;">🎁 ¡Un regalo para tu próxima compra!</p>
      <p style="margin:5px 0 0; font-size:12px; color:#B45309;">Usa el código <strong>VOLVER10</strong> para un 10% de descuento.</p>
    </div>
    
    <div style="text-align:center; margin-top:30px;">
      <a href="{{whatsappLink}}" class="button" style="background-color:#2563eb;">¿Dudas? Escríbenos</a>
    </div>
  </div>
  <div class="footer">
    <p style="font-weight:bold; color:#374151;">OlivoMarket Gourmet</p>
    <p>Santiago, Chile</p>
    <div style="margin:20px 0;">
      <a href="https://instagram.com/olivomarket" class="social-link">Instagram</a>
      <a href="https://facebook.com/olivomarket" class="social-link">Facebook</a>
    </div>
    <p style="font-size:11px;">© {{year}} OlivoMarket. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;

const POS_RECEIPT_TEMPLATE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header">
    <h1 style="font-size:24px; margin:0;">BOLETA DIGITAL</h1>
    <p>OlivoMarket #{{saleId}}</p>
  </div>
  <div class="content">
    <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
      <span style="color:#6b7280;">Fecha: {{date}}</span>
    </div>
    <p>Hola <strong>{{customerName}}</strong>, gracias por tu compra presencial.</p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:10px; text-align:left; font-size:12px; color:#6b7280;">Items</th>
          <th style="padding:10px; text-align:center; font-size:12px; color:#6b7280;">Cant.</th>
          <th style="padding:10px; text-align:right; font-size:12px; color:#6b7280;">Precio</th>
        </tr>
      </thead>
      <tbody>{{itemsTable}}</tbody>
    </table>
    <div style="background:#064E3B; border-radius:12px; padding:20px; color:#ffffff; text-align:center;">
       <p style="margin:0; opacity:0.8;">Total</p>
       <p style="margin:5px 0 0; font-size:32px; font-weight:bold;">{{total}}</p>
       <p style="margin:10px 0 0; font-size:12px; opacity:0.8;">{{paymentMethod}}</p>
    </div>
    {{paymentDetails}}
  </div>
  <div class="footer">
    <p>¡Gracias por preferir calidad gourmet! 🌿</p>
  </div>
</div>
</body></html>`;

const WELCOME_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header">
    <h1 style="margin:0; font-size:28px; letter-spacing:-1px;">¡Te damos la bienvenida!</h1>
    <p style="margin:10px 0 0; opacity:0.9;">A la familia OlivoMarket Gourmet</p>
  </div>
  <div class="content">
    <p style="font-size:18px; font-weight:bold; color:#111827; text-align:center;">¡Hola {{customerName}}!</p>
    <p style="text-align:center;">Estamos felices de tenerte aquí. En OlivoMarket seleccionamos lo mejor para tu mesa, con despacho rápido y calidad garantizada.</p>
    
    {{couponBlock}}
    
    <div class="divider"></div>
    
    {{pointsBlock}}
    
    <div style="text-align:center; margin-top:30px;">
      <a href="https://olivomarket.cl/productos" class="button">Ver Catálogo Premium</a>
    </div>
  </div>
  <div class="footer">
    <p style="font-weight:bold; color:#374151;">OlivoMarket Gourmet</p>
    <div style="margin:20px 0;">
      <a href="https://instagram.com/olivomarket" class="social-link">Instagram</a>
      <a href="https://facebook.com/olivomarket" class="social-link">Facebook</a>
    </div>
    <p style="font-size:11px;">© {{year}} OlivoMarket. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;

const PASSWORD_RESET_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header">
    <h1 style="margin:0; font-size:26px; letter-spacing:-1px;">Restablecer tu contraseña</h1>
  </div>
  <div class="content">
    <p style="font-size:16px; color:#111827;">Hola {{customerName}},</p>
    <p>Recibimos una solicitud para cambiar la contrase\u00f1a de tu cuenta en OlivoMarket. Para elegir una nueva, usa el bot\u00f3n de abajo.</p>

    <div style="text-align:center; margin:30px 0;">
      <a href="{{resetUrl}}" class="button">Crear nueva contrase\u00f1a</a>
    </div>

    <p style="font-size:13px; color:#6B7280;">El enlace vence en 1 hora y solo puede usarse una vez.</p>

    <div class="divider"></div>

    <p style="font-size:13px; color:#6B7280;">Si no pediste este cambio, puedes ignorar este correo: tu contrase\u00f1a actual sigue funcionando.</p>
    <p style="font-size:12px; color:#9CA3AF; word-break:break-all;">Si el bot\u00f3n no funciona, copia esta direcci\u00f3n en tu navegador:<br>{{resetUrl}}</p>
  </div>
  <div class="footer">
    <p style="font-weight:bold; color:#374151;">OlivoMarket</p>
    <p style="font-size:11px;">\u00a9 {{year}} OlivoMarket. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;

const ABANDONED_CART_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header" style="background:#064E3B;">
    <h1 style="margin:0;">¿LO SIGUES QUERIENDO? 🛒</h1>
  </div>
  <div class="content" style="text-align:center;">
    <p>Hola {{customerName}}, tus productos seleccionados te están esperando.</p>
    <div style="text-align:left; margin:20px 0;">
      {{itemsHtml}}
    </div>
    {{couponBlock}}
    <a href="{{cartUrl}}" class="button">COMPLETAR COMPRA →</a>
  </div>
  <div class="footer">
    <p>OlivoMarket · Gourmet a domicilio</p>
  </div>
</div>
</body></html>`;

const ORDER_STATUS_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header">
    <div style="background:rgba(255,255,255,0.2); padding:6px 14px; border-radius:100px; display:inline-block; font-size:12px; font-weight:bold; margin-bottom:15px;">ACTUALIZACIÓN DE PEDIDO</div>
    <h1 style="margin:0; font-size:28px; letter-spacing:-1px;">Tu pedido está {{status}}</h1>
  </div>
  <div class="content">
    <p style="font-size:18px; font-weight:bold; color:#111827;">Hola {{customerName}},</p>
    <p>Tu pedido <strong>#{{orderId}}</strong> ha cambiado de estado a: <strong style="color:#10B981; text-transform:uppercase;">{{status}}</strong>.</p>
    
    <div style="margin:30px 0; border:1px solid #edf2f7; border-radius:16px; padding:25px; background-color:#f9fafb;">
      <p style="margin:0; font-size:12px; color:#6b7280; text-transform:uppercase; font-weight:bold;">Detalles de la Entrega</p>
      <p style="margin:10px 0 0; font-size:14px;"><strong>Dirección:</strong> {{address}}</p>
    </div>

    <div style="text-align:center; margin-top:30px;">
      <a href="https://olivomarket.cl/mi-cuenta/pedidos/{{orderId}}" class="button">Ver seguimiento</a>
    </div>
  </div>
  <div class="footer">
    <p style="font-weight:bold; color:#374151;">OlivoMarket Gourmet</p>
    <p>© {{year}} OlivoMarket. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;

const ORDER_PREPARING_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #065F46 0%, #0D9488 100%);">
    <div style="background:rgba(255,255,255,0.2); padding:6px 14px; border-radius:100px; display:inline-block; font-size:12px; font-weight:bold; margin-bottom:15px; letter-spacing:1px;">EN PREPARACIÓN</div>
    <h1 style="margin:0; font-size:28px; letter-spacing:-1px;">👨‍🍳 Estamos preparando tu pedido</h1>
  </div>
  <div class="content">
    <p style="font-size:18px; font-weight:bold; color:#111827;">Hola {{customerName}},</p>
    <p>Tu pedido <strong>#{{orderId}}</strong> ya está en manos de nuestro equipo en OlivoMarket. Estamos seleccionando cada producto gourmet con la máxima dedicación y cuidando rigurosamente la frescura de tus alimentos.</p>
    
    <div style="margin:25px 0; border:1px solid #e5e7eb; border-radius:16px; padding:22px; background-color:#f9fafb;">
      <p style="margin:0; font-size:12px; color:#6b7280; text-transform:uppercase; font-weight:bold; letter-spacing:0.5px;">Detalles de Entrega</p>
      <p style="margin:8px 0 0; font-size:15px; color:#1f2937;"><strong>Dirección:</strong> {{address}}</p>
      {{deliveryMethodBlock}}
    </div>

    <div style="background-color:#ecfdf5; border-left:4px solid #10b981; padding:16px; border-radius:8px; margin:20px 0;">
      <p style="margin:0; font-size:13px; color:#065f46;">❄️ <strong>Cadena de Frío Garantizada:</strong> Tus productos perecibles permanecen refrigerados hasta el momento de su entrega.</p>
    </div>

    <div style="text-align:center; margin-top:30px;">
      <a href="https://olivomarket.cl/mi-cuenta/pedidos/{{orderId}}" class="button" style="background-color:#059669;">Ver estado del pedido</a>
    </div>

    <div class="divider"></div>

    <div style="text-align:center;">
      <p style="font-size:13px; color:#6b7280; margin:0 0 8px;">¿Necesitas agregar algo de último minuto a tu orden?</p>
      <a href="{{whatsappLink}}" style="color:#059669; font-weight:bold; text-decoration:none; font-size:14px;">Escríbenos por WhatsApp de inmediato →</a>
    </div>
  </div>
  <div class="footer">
    <p style="font-weight:bold; color:#374151;">OlivoMarket Gourmet</p>
    <p style="font-size:11px; color:#9ca3af;">© {{year}} OlivoMarket. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;

const ORDER_SHIPPED_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%);">
    <div style="background:rgba(255,255,255,0.2); padding:6px 14px; border-radius:100px; display:inline-block; font-size:12px; font-weight:bold; margin-bottom:15px; letter-spacing:1px;">EN CAMINO</div>
    <h1 style="margin:0; font-size:28px; letter-spacing:-1px;">🚚 ¡Tu pedido va en camino!</h1>
  </div>
  <div class="content">
    <p style="font-size:18px; font-weight:bold; color:#111827;">Hola {{customerName}},</p>
    <p>¡Excelentes noticias! Tu pedido <strong>#{{orderId}}</strong> ha salido de nuestra tienda y está en ruta hacia tu destino.</p>
    
    <div style="margin:25px 0; border:1px solid #dbeafe; border-radius:16px; padding:22px; background-color:#eff6ff;">
      <p style="margin:0; font-size:12px; color:#1e40af; text-transform:uppercase; font-weight:bold;">Destino del Despacho</p>
      <p style="margin:8px 0 0; font-size:15px; color:#1e3a8a;"><strong>Dirección:</strong> {{address}}</p>
      {{shippingMethodBlock}}
    </div>

    {{trackingBlock}}

    <div style="background-color:#fffbeb; border:1px solid #fde68a; padding:16px; border-radius:12px; margin:20px 0;">
      <p style="margin:0; font-size:13px; color:#92400e;">💡 <strong>Recomendación:</strong> Por favor asegúrate de estar atento/a a tu teléfono o timbre para recibir al repartidor.</p>
    </div>

    <div style="text-align:center; margin-top:30px;">
      <a href="{{trackingUrlFallback}}" class="button" style="background-color:#2563eb;">Seguir mi pedido</a>
    </div>
  </div>
  <div class="footer">
    <p style="font-weight:bold; color:#374151;">OlivoMarket Gourmet</p>
    <div style="margin:15px 0;">
      <a href="{{whatsappLink}}" class="social-link" style="color:#2563eb; border-color:#bfdbfe;">Contactar soporte</a>
    </div>
    <p style="font-size:11px; color:#9ca3af;">© {{year}} OlivoMarket. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;

const ORDER_DELIVERED_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #064E3B 0%, #10B981 100%);">
    <div style="background:rgba(255,255,255,0.2); padding:6px 14px; border-radius:100px; display:inline-block; font-size:12px; font-weight:bold; margin-bottom:15px; letter-spacing:1px;">ENTREGADO CON ÉXITO</div>
    <h1 style="margin:0; font-size:28px; letter-spacing:-1px;">🎉 ¡Tu pedido ha sido entregado!</h1>
  </div>
  <div class="content">
    <p style="font-size:18px; font-weight:bold; color:#111827;">Hola {{customerName}},</p>
    <p>Confirmamos que tu pedido <strong>#{{orderId}}</strong> fue entregado con éxito en <strong>{{address}}</strong>. Esperamos que disfrutes tus productos.</p>
    
    {{loyaltyPointsBlock}}

    <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:16px; padding:24px; text-align:center; margin:25px 0;">
      <p style="margin:0; font-size:15px; font-weight:bold; color:#1e293b;">¿Cómo estuvo tu experiencia de hoy?</p>
      <p style="margin:6px 0 15px; font-size:13px; color:#64748b;">Tu opinión nos ayuda a perfeccionar nuestro servicio gourmet.</p>
      <div style="font-size:28px; letter-spacing:8px;">
        <a href="{{reviewLink}}?rating=5" style="text-decoration:none;">⭐</a>
        <a href="{{reviewLink}}?rating=5" style="text-decoration:none;">⭐</a>
        <a href="{{reviewLink}}?rating=5" style="text-decoration:none;">⭐</a>
        <a href="{{reviewLink}}?rating=5" style="text-decoration:none;">⭐</a>
        <a href="{{reviewLink}}?rating=5" style="text-decoration:none;">⭐</a>
      </div>
    </div>

    <div class="divider"></div>

    <div style="text-align:center;">
      <p style="font-size:13px; color:#6b7280; margin:0 0 10px;">¿Tuviste algún problema o producto faltante?</p>
      <a href="{{whatsappLink}}" style="color:#059669; font-weight:bold; text-decoration:none; font-size:14px;">Escríbenos por WhatsApp y lo resolvemos en minutos →</a>
    </div>
  </div>
  <div class="footer">
    <p style="font-weight:bold; color:#374151;">OlivoMarket Gourmet</p>
    <p style="font-size:11px; color:#9ca3af;">© {{year}} OlivoMarket. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;

const ORDER_CANCELLED_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header" style="background: linear-gradient(135deg, #881337 0%, #E11D48 100%);">
    <div style="background:rgba(255,255,255,0.2); padding:6px 14px; border-radius:100px; display:inline-block; font-size:12px; font-weight:bold; margin-bottom:15px; letter-spacing:1px;">PEDIDO CANCELADO</div>
    <h1 style="margin:0; font-size:28px; letter-spacing:-1px;">Información de tu pedido #{{orderId}}</h1>
  </div>
  <div class="content">
    <p style="font-size:18px; font-weight:bold; color:#111827;">Hola {{customerName}},</p>
    <p>Te informamos que tu pedido <strong>#{{orderId}}</strong> ha sido cancelado.</p>
    
    <div style="background-color:#fff1f2; border:1px solid #fecdd3; border-radius:12px; padding:18px; margin:20px 0;">
      <p style="margin:0; font-size:12px; color:#9f1239; font-weight:bold; text-transform:uppercase;">Motivo:</p>
      <p style="margin:6px 0 0; font-size:14px; color:#881337;">{{cancelReason}}</p>
    </div>

    {{pointsRefundNotice}}

    {{paymentRefundNotice}}

    <div style="text-align:center; margin-top:30px;">
      <a href="https://olivomarket.cl/productos" class="button" style="background-color:#111827;">Explorar el catálogo</a>
    </div>

    <div class="divider"></div>

    <div style="text-align:center;">
      <p style="font-size:13px; color:#6b7280; margin:0 0 10px;">Si crees que esto fue un error o necesitas ayuda personalizada:</p>
      <a href="{{whatsappLink}}" class="social-link" style="color:#e11d48; border-color:#fecdd3; font-weight:bold;">Atención al cliente vía WhatsApp</a>
    </div>
  </div>
  <div class="footer">
    <p style="font-weight:bold; color:#374151;">OlivoMarket Gourmet</p>
    <p style="font-size:11px; color:#9ca3af;">© {{year}} OlivoMarket. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;

const REVIEW_REQUEST_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header">
    <h1 style="margin:0; font-size:28px; letter-spacing:-1px;">¿Cómo estuvo todo?</h1>
  </div>
  <div class="content" style="text-align:center;">
    <p style="font-size:18px; font-weight:bold; color:#111827;">Hola {{customerName}},</p>
    <p>Hace unos días recibiste tu pedido #{{orderId}}. Queremos saber si cumplimos tus expectativas.</p>
    <div style="margin:40px 0;">
      <p style="font-size:14px; color:#6b7280; margin-bottom:15px;">Califícanos:</p>
      <div style="font-size:32px;">
        <a href="{{reviewLink}}?rating=5" style="text-decoration:none;">⭐</a>
        <a href="{{reviewLink}}?rating=5" style="text-decoration:none;">⭐</a>
        <a href="{{reviewLink}}?rating=5" style="text-decoration:none;">⭐</a>
        <a href="{{reviewLink}}?rating=5" style="text-decoration:none;">⭐</a>
        <a href="{{reviewLink}}?rating=5" style="text-decoration:none;">⭐</a>
      </div>
    </div>
    <a href="{{whatsappLink}}" style="color:#10B981; font-size:14px;">¿Tuviste algún problema? Cuéntanos por WhatsApp</a>
  </div>
  <div class="footer">
    <p>© {{year}} OlivoMarket</p>
  </div>
</div>
</body></html>`;

const SUPPLIER_ORDER_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header">
    <h1 style="margin:0;">ORDEN DE COMPRA</h1>
    <p>#{{orderId}}</p>
  </div>
  <div class="content">
    <p>Hola <strong>{{supplierName}}</strong>, envío detalle de pedido OlivoMarket:</p>
    <table style="width:100%; border-collapse:collapse; margin:20px 0;">
      <thead>
        <tr style="background:#F9FAFB">
          <th style="padding:10px; text-align:left;">Producto / SKU</th>
          <th style="padding:10px; text-align:center;">Cant.</th>
        </tr>
      </thead>
      <tbody>{{itemsTable}}</tbody>
    </table>
    {{notesBlock}}
    <p>Espero confirmación. Saludos.</p>
  </div>
  <div class="footer">
    <p>OlivoMarket Gourmet</p>
  </div>
</div>
</body></html>`;

// ── Shared Services ─────────────────────────────────────────────────────

/** Send order confirmation (web checkout) */
export async function sendOrderConfirmation(data: {
  to: string;
  customerName: string;
  orderId: string;
  total: number;
  itemCount: number;
  paymentMethod: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  pointsEarned?: number;
  pointsBalance?: number;
  whatsappPhone?: string;
}): Promise<EmailResult> {
  const itemsHtml = data.items
    .map(
      (item: any) =>
        `<tr>
      <td style="padding:16px 12px;border-bottom:1px solid #f3f4f6;vertical-align:middle">
        <div>
          <p style="margin:0;font-size:14px;font-weight:700;color:#111827;">${item.name}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#6b7280">${item.quantity} un. x $${item.price.toLocaleString("es-CL")}</p>
        </div>
      </td>
      <td style="padding:16px 12px;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;font-weight:800;text-align:right">$${(item.price * item.quantity).toLocaleString("es-CL")}</td>
    </tr>`
    )
    .join("");

  const pointsBlock = data.pointsEarned && data.pointsEarned > 0
    ? `<div style="background-color:#ecfdf5;border:1px dashed #10b981;border-radius:12px;padding:15px;text-align:center;margin:20px 0;">
        <p style="margin:0;font-size:14px;font-weight:bold;color:#065f46;">🌟 ¡Sumaste ${data.pointsEarned.toLocaleString("es-CL")} puntos con este pedido!</p>
        ${data.pointsBalance ? `<p style="margin:4px 0 0;font-size:12px;color:#059669;">Tu saldo acumulado es de <strong>${data.pointsBalance.toLocaleString("es-CL")} puntos</strong> en el Club OlivoMarket</p>` : ""}
      </div>`
    : "";

  const { subject: dbSubject, html: dbHtml } = await getTemplate(
    "order_confirmation",
    `✅ Pedido confirmado #${data.orderId}`,
    ORDER_CONFIRMATION_TEMPLATE
  );

  const whatsappMessage = `Hola OlivoMarket! Consulta sobre mi pedido #${data.orderId}`;
  const whatsappUrl = resolveWhatsAppLink(data.whatsappPhone, whatsappMessage);

  const html = renderTemplate(dbHtml, {
    customerName: data.customerName,
    orderId: data.orderId,
    total: `$${data.total.toLocaleString("es-CL")}`,
    itemCount: data.itemCount,
    paymentMethod: data.paymentMethod,
    itemsTable: itemsHtml,
    pointsBlock,
    whatsappLink: whatsappUrl,
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: renderTemplate(dbSubject, { orderId: data.orderId }),
    html,
    templateSlug: "order_confirmation",
    metadata: { orderId: data.orderId, total: data.total, pointsEarned: data.pointsEarned },
  });
}

/** Send POS receipt */
export async function sendPOSReceipt(data: {
  to: string;
  customerName?: string;
  saleId: string | number;
  total: number;
  paymentMethod: string;
  cashReceived?: number;
  changeGiven?: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}): Promise<EmailResult> {
  const itemsHtml = data.items
    .map(
      (item) =>
        `<tr>
      <td style="padding:10px;border-bottom:1px solid #f0f0f0;font-size:13px;">${item.name}</td>
      <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:center;">${item.quantity}</td>
      <td style="padding:10px;border-bottom:1px solid #f0f0f0;text-align:right;">$${item.price.toLocaleString("es-CL")}</td>
    </tr>`
    )
    .join("");

  const paymentDetails =
    data.paymentMethod === "cash" && data.cashReceived
      ? `<p style="margin:20px 0 0;font-size:13px;color:#6B7280;text-align:center;">Efectivo: $${data.cashReceived.toLocaleString("es-CL")} · Vuelto: $${(data.changeGiven || 0).toLocaleString("es-CL")}</p>`
      : "";

  const html = renderTemplate(POS_RECEIPT_TEMPLATE, {
    customerName: data.customerName || "Cliente",
    saleId: String(data.saleId),
    total: `$${data.total.toLocaleString("es-CL")}`,
    paymentMethod: data.paymentMethod,
    paymentDetails,
    itemsTable: itemsHtml,
    date: new Date().toLocaleString("es-CL", { dateStyle: "long" }),
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: `🧾 Boleta OlivoMarket #${data.saleId}`,
    html,
    templateSlug: "pos_receipt",
  });
}

/** Welcome email */
export async function sendWelcomeEmail(data: {
  to: string;
  customerName: string;
  couponCode?: string;
  bonusPoints?: number;
}): Promise<EmailResult> {
  const couponBlock = data.couponCode
    ? `<div style="background:#ECFDF5;border:2px dashed #10B981;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
        <p style="margin:0;font-size:12px;color:#065F46;">🎁 Cupón Bienvenida:</p>
        <p style="margin:10px 0 0;font-size:28px;font-weight:900;color:#059669;letter-spacing:2px;">${data.couponCode}</p>
      </div>`
    : "";

  const { subject: dbSubject, html: dbHtml } = await getTemplate(
    "welcome",
    "¡Bienvenido/a a OlivoMarket! 🌿",
    WELCOME_TEMPLATE
  );

  const html = renderTemplate(dbHtml, {
    customerName: data.customerName,
    couponBlock,
    pointsBlock: data.bonusPoints ? `<p style="text-align:center;">🌟 ¡Ganaste ${data.bonusPoints} puntos!</p>` : "",
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: dbSubject,
    html,
    templateSlug: "welcome",
  });
}

/** Enlace de recuperación de contraseña. */
export async function sendPasswordResetEmail(data: {
  to: string;
  customerName: string;
  resetUrl: string;
}): Promise<EmailResult> {
  const { subject: dbSubject, html: dbHtml } = await getTemplate(
    "password-reset",
    "Restablece tu contraseña de OlivoMarket",
    PASSWORD_RESET_TEMPLATE
  );

  const html = renderTemplate(dbHtml, {
    customerName: data.customerName,
    resetUrl: data.resetUrl,
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: dbSubject,
    html,
    templateSlug: "password-reset",
  });
}

/** Abandoned cart */
export async function sendAbandonedCartReminder(data: {
  to: string;
  customerName: string;
  cartUrl: string;
  items: Array<{ name: string; price: number; image?: string }>;
  discountCode?: string;
}): Promise<EmailResult> {
  const itemsHtml = data.items
    .map(
      (item) =>
        `<div style="display:flex;align-items:center;padding:12px;border:1px solid #f3f4f6;border-radius:12px;margin-bottom:8px">
          <div style="flex:1">
            <p style="margin:0;font-size:14px;font-weight:700;">${item.name}</p>
            <p style="margin:0;font-size:12px;color:#059669">$${item.price.toLocaleString("es-CL")}</p>
          </div>
        </div>`
    )
    .join("");

  const couponBlock = data.discountCode
    ? `<div style="background:#FFFBEB;border:2px dashed #F59E0B;border-radius:12px;padding:16px;text-align:center;margin:20px 0">
        <p style="margin:0;font-size:24px;color:#D97706">${data.discountCode}</p>
      </div>`
    : "";

  const html = renderTemplate(ABANDONED_CART_TEMPLATE, {
    customerName: data.customerName,
    itemsHtml,
    couponBlock,
    cartUrl: data.cartUrl,
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    subject: `🛒 ¡Tus productos te extrañan!`,
    html,
    templateSlug: "abandoned_cart",
  });
}

/** Review Request */
export async function sendReviewRequest(data: {
  to: string;
  customerName: string;
  orderId: string;
}): Promise<EmailResult> {
  const whatsappLink = resolveWhatsAppLink(
    undefined,
    `Hola OlivoMarket! Tengo un comentario o duda sobre mi pedido #${data.orderId}`
  );

  const html = renderTemplate(REVIEW_REQUEST_TEMPLATE, {
    customerName: data.customerName,
    orderId: data.orderId,
    reviewLink: `https://olivomarket.cl/feedback/${data.orderId}`,
    whatsappLink,
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: `⭐ ¿Cómo estuvo tu pedido #${data.orderId}?`,
    html,
    templateSlug: "review_request",
  });
}

/** Send Order Preparing Email (Etapa: En preparación) */
export async function sendOrderPreparingEmail(data: {
  to: string;
  customerName: string;
  orderId: string;
  address?: string;
  shippingMethod?: string;
  whatsappPhone?: string;
}): Promise<EmailResult> {
  const { subject: dbSubject, html: dbHtml } = await getTemplate(
    "order_preparing",
    `👨‍🍳 Tu pedido #${data.orderId} se está preparando con cuidado`,
    ORDER_PREPARING_TEMPLATE
  );

  const deliveryMethodBlock = data.shippingMethod
    ? `<p style="margin:6px 0 0; font-size:14px; color:#4b5563;"><strong>Método:</strong> ${data.shippingMethod}</p>`
    : "";

  const html = renderTemplate(dbHtml, {
    customerName: data.customerName,
    orderId: data.orderId,
    address: data.address || "Dirección registrada",
    deliveryMethodBlock,
    whatsappLink: resolveWhatsAppLink(data.whatsappPhone, `Hola OlivoMarket! Consulta sobre la preparación de mi pedido #${data.orderId}`),
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: renderTemplate(dbSubject, { orderId: data.orderId }),
    html,
    templateSlug: "order_preparing",
    metadata: { orderId: data.orderId, stage: "preparing" },
  });
}

/** Send Order Shipped Email (Etapa: En camino / Despachado) */
export async function sendOrderShippedEmail(data: {
  to: string;
  customerName: string;
  orderId: string;
  address?: string;
  shippingMethod?: string;
  trackingUrl?: string;
  trackingNumber?: string;
  whatsappPhone?: string;
}): Promise<EmailResult> {
  const { subject: dbSubject, html: dbHtml } = await getTemplate(
    "order_shipped",
    `🚚 ¡Tu pedido #${data.orderId} va en camino!`,
    ORDER_SHIPPED_TEMPLATE
  );

  const trackingBlock = data.trackingUrl
    ? `<div style="background-color:#eff6ff; border:1px solid #bfdbfe; border-radius:12px; padding:18px; margin:20px 0; text-align:center;">
        <p style="margin:0 0 10px; font-size:13px; color:#1e40af; font-weight:bold;">Seguimiento en tiempo real</p>
        <a href="${data.trackingUrl}" class="button" style="background-color:#2563eb; margin:5px 0;">Ver ubicación del repartidor</a>
        ${data.trackingNumber ? `<p style="margin:10px 0 0; font-size:12px; color:#6b7280;">Nº seguimiento: <strong>${data.trackingNumber}</strong></p>` : ""}
      </div>`
    : (data.trackingNumber
        ? `<div style="background-color:#f3f4f6; border-radius:8px; padding:12px; margin:15px 0; font-size:13px; color:#374151;">Número de seguimiento: <strong>${data.trackingNumber}</strong></div>`
        : "");

  const shippingMethodBlock = data.shippingMethod
    ? `<p style="margin:6px 0 0; font-size:14px; color:#1e40af;"><strong>Modalidad:</strong> ${data.shippingMethod}</p>`
    : "";

  const trackingUrlFallback = data.trackingUrl || `https://olivomarket.cl/mi-cuenta/pedidos/${data.orderId}`;

  const html = renderTemplate(dbHtml, {
    customerName: data.customerName,
    orderId: data.orderId,
    address: data.address || "Dirección registrada",
    shippingMethodBlock,
    trackingBlock,
    trackingUrlFallback,
    whatsappLink: resolveWhatsAppLink(data.whatsappPhone, `Hola OlivoMarket! Consulta sobre el despacho de mi pedido #${data.orderId}`),
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: renderTemplate(dbSubject, { orderId: data.orderId }),
    html,
    templateSlug: "order_shipped",
    metadata: { orderId: data.orderId, stage: "shipped", trackingUrl: data.trackingUrl },
  });
}

/** Send Order Delivered Email (Etapa: Entregado / Completado) */
export async function sendOrderDeliveredEmail(data: {
  to: string;
  customerName: string;
  orderId: string;
  address?: string;
  pointsEarned?: number;
  pointsBalance?: number;
  whatsappPhone?: string;
}): Promise<EmailResult> {
  const { subject: dbSubject, html: dbHtml } = await getTemplate(
    "order_delivered",
    `🎉 ¡Tu pedido #${data.orderId} ha sido entregado!`,
    ORDER_DELIVERED_TEMPLATE
  );

  const loyaltyPointsBlock = data.pointsEarned && data.pointsEarned > 0
    ? `<div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border:1px solid #a7f3d0; border-radius:16px; padding:20px; text-align:center; margin:20px 0;">
        <p style="margin:0; font-size:13px; color:#065f46; font-weight:bold; text-transform:uppercase; letter-spacing:0.5px;">Club OlivoMarket</p>
        <p style="margin:6px 0 0; font-size:26px; font-weight:900; color:#047857;">+${data.pointsEarned.toLocaleString("es-CL")} pts</p>
        <p style="margin:6px 0 0; font-size:13px; color:#065f46;">Acreditados en tu cuenta${data.pointsBalance ? ` (Saldo: <strong>${data.pointsBalance.toLocaleString("es-CL")} pts</strong>)` : ""}</p>
        <p style="margin:8px 0 0; font-size:11px; color:#059669;">Úsalos como descuento en tu próxima compra gourmet.</p>
      </div>`
    : "";

  const html = renderTemplate(dbHtml, {
    customerName: data.customerName,
    orderId: data.orderId,
    address: data.address || "tu domicilio",
    loyaltyPointsBlock,
    reviewLink: `https://olivomarket.cl/feedback/${data.orderId}`,
    whatsappLink: resolveWhatsAppLink(data.whatsappPhone, `Hola OlivoMarket! Necesito ayuda con mi pedido entregado #${data.orderId}`),
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: renderTemplate(dbSubject, { orderId: data.orderId }),
    html,
    templateSlug: "order_delivered",
    metadata: { orderId: data.orderId, stage: "delivered", pointsEarned: data.pointsEarned },
  });
}

/** Send Order Cancelled Email (Etapa: Cancelado / Rechazado) */
export async function sendOrderCancelledEmail(data: {
  to: string;
  customerName: string;
  orderId: string;
  cancelReason?: string;
  pointsRefunded?: number;
  paymentRefunded?: boolean;
  whatsappPhone?: string;
}): Promise<EmailResult> {
  const { subject: dbSubject, html: dbHtml } = await getTemplate(
    "order_cancelled",
    `Actualización sobre tu pedido #${data.orderId} en OlivoMarket`,
    ORDER_CANCELLED_TEMPLATE
  );

  const pointsRefundNotice = data.pointsRefunded && data.pointsRefunded > 0
    ? `<div style="background-color:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:16px; margin:15px 0;">
        <p style="margin:0; font-size:13px; color:#166534;">🌟 <strong>Puntos restablecidos:</strong> Se han devuelto <strong>${data.pointsRefunded.toLocaleString("es-CL")} puntos</strong> a tu cuenta del Club OlivoMarket.</p>
      </div>`
    : "";

  const paymentRefundNotice = data.paymentRefunded
    ? `<div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px; margin:15px 0;">
        <p style="margin:0; font-size:13px; color:#334155;">💳 <strong>Reembolso:</strong> El pago ha sido reversado. El plazo de reflejo dependerá de tu medio de pago.</p>
      </div>`
    : "";

  const html = renderTemplate(dbHtml, {
    customerName: data.customerName,
    orderId: data.orderId,
    cancelReason: data.cancelReason || "No pudimos completar el procesamiento de tu orden.",
    pointsRefundNotice,
    paymentRefundNotice,
    whatsappLink: resolveWhatsAppLink(data.whatsappPhone, `Hola OlivoMarket! Consulta sobre la cancelación de mi pedido #${data.orderId}`),
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: renderTemplate(dbSubject, { orderId: data.orderId }),
    html,
    templateSlug: "order_cancelled",
    metadata: { orderId: data.orderId, stage: "cancelled", cancelReason: data.cancelReason },
  });
}

export type OrderStatusEmailPayload = {
  to: string;
  customerName: string;
  orderId: string;
  status: string;
  address?: string;
  shippingMethod?: string;
  trackingUrl?: string;
  trackingNumber?: string;
  pointsEarned?: number;
  pointsBalance?: number;
  pointsRefunded?: number;
  paymentRefunded?: boolean;
  cancelReason?: string;
  whatsappPhone?: string;
};

/** Order Status Update (Intelligent router by stage) */
export async function sendOrderStatusEmail(data: OrderStatusEmailPayload): Promise<EmailResult> {
  const norm = String(data.status || "").toLowerCase().trim();

  // En preparación
  if (norm === "processing" || norm === "procesando" || norm === "preparando" || norm.includes("prepar")) {
    return sendOrderPreparingEmail({
      to: data.to,
      customerName: data.customerName,
      orderId: data.orderId,
      address: data.address,
      shippingMethod: data.shippingMethod,
      whatsappPhone: data.whatsappPhone,
    });
  }

  // En camino / despachado
  if (norm === "shipped" || norm === "enviado" || norm === "en_camino" || norm.includes("camino") || norm.includes("despach")) {
    return sendOrderShippedEmail({
      to: data.to,
      customerName: data.customerName,
      orderId: data.orderId,
      address: data.address,
      shippingMethod: data.shippingMethod,
      trackingUrl: data.trackingUrl,
      trackingNumber: data.trackingNumber,
      whatsappPhone: data.whatsappPhone,
    });
  }

  // Entregado / completado
  if (norm === "delivered" || norm === "entregado" || norm === "completado") {
    return sendOrderDeliveredEmail({
      to: data.to,
      customerName: data.customerName,
      orderId: data.orderId,
      address: data.address,
      pointsEarned: data.pointsEarned,
      pointsBalance: data.pointsBalance,
      whatsappPhone: data.whatsappPhone,
    });
  }

  // Cancelado / rechazado / reembolsado
  if (norm === "cancelled" || norm === "cancelado" || norm === "rechazado" || norm === "refunded" || norm === "reembolsado") {
    return sendOrderCancelledEmail({
      to: data.to,
      customerName: data.customerName,
      orderId: data.orderId,
      cancelReason: data.cancelReason || (norm === "refunded" || norm === "reembolsado" ? "Pedido reembolsado" : "Pedido cancelado"),
      pointsRefunded: data.pointsRefunded,
      paymentRefunded: data.paymentRefunded || norm === "refunded" || norm === "reembolsado",
      whatsappPhone: data.whatsappPhone,
    });
  }

  // Fallback genérico para otros estados
  const { subject: dbSubject, html: dbHtml } = await getTemplate(
    "order_status_update",
    `📦 Actualización de tu pedido #${data.orderId}`,
    ORDER_STATUS_TEMPLATE
  );

  const html = renderTemplate(dbHtml, {
    customerName: data.customerName,
    orderId: data.orderId,
    status: data.status,
    address: data.address || "Dirección registrada",
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: renderTemplate(dbSubject, { orderId: data.orderId, status: data.status }),
    html,
    templateSlug: "order_status_update",
    metadata: { orderId: data.orderId, status: data.status },
  });
}

/** Supplier Order */
export async function sendSupplierOrderEmail(props: {
  toEmail: string;
  orderId: string;
  supplierName: string;
  expectedDate: string;
  notes?: string;
  items: Array<{ name: string; sku?: string; quantity: number }>;
}): Promise<EmailResult> {
  let itemsTable = "";
  for (const item of props.items) {
    itemsTable += `
      <tr style="border-bottom:1px solid #e5e7eb">
        <td style="padding:10px;">${item.name} (${item.sku || "N/A"})</td>
        <td style="padding:10px; text-align:center;">${item.quantity}</td>
      </tr>
    `;
  }

  const html = renderTemplate(SUPPLIER_ORDER_TEMPLATE, {
    orderId: props.orderId.substring(0, 8).toUpperCase(),
    supplierName: props.supplierName,
    itemsTable,
    notesBlock: props.notes ? `<p><strong>Notas:</strong> ${props.notes}</p>` : "",
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: props.toEmail,
    toName: props.supplierName,
    subject: `Orden de Compra #${props.orderId.substring(0,8).toUpperCase()}`,
    html,
    templateSlug: "supplier_order",
  });
}

// ── Internal Logging ────────────────────────────────────────────────────

async function logEmail(entry: {
  to: string;
  toName?: string;
  subject: string;
  templateSlug?: string;
  status: string;
  resendId?: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    await supabaseServer.from("email_log").insert({
      to_email: entry.to,
      to_name: entry.toName || null,
      from_email: FROM_EMAIL,
      subject: entry.subject,
      template_slug: entry.templateSlug || null,
      status: entry.status,
      resend_id: entry.resendId || null,
      error_message: entry.errorMessage || null,
      metadata: entry.metadata || {},
    });
  } catch (err) {
    logger.warn("[Email] ⚠️ Log error:", err);
  }
}
