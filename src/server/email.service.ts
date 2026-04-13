import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";

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
      console.error("[Email] Resend error:", error);
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
    console.log(`[Email] ✅ Sent to ${to} — ID: ${resendId}`);

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
    console.error("[Email] 🔥 Critical error:", message);

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
      .select("subject, body_html")
      .eq("slug", slug)
      .single();

    if (error || !data) {
      console.warn(`[Email] Template slug "${slug}" not found in DB. Using fallback.`);
      return { subject: fallbackSubject, html: fallbackHtml };
    }

    return { subject: data.subject, html: data.body_html };
  } catch (err) {
    console.error(`[Email] Error fetching template "${slug}":`, err);
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

const PROMO_CAMPAIGN_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body>
<div class="container">
  <div class="header" style="background:#000000;">
    <h1 style="color:#ffffff;">OFERTA RELÁMPAGO ⚡</h1>
  </div>
  <div class="content" style="text-align:center;">
    <h2 style="font-size:24px;">¡Solo por Tiempo Limitado!</h2>
    <p>{{promoMessage}}</p>
    <div style="background-color:#fff7ed; padding:30px; border-radius:16px; margin:25px 0; border:2px dashed #f97316;">
      <p style="margin:0; font-size:14px; color:#9a3412;">Código:</p>
      <p style="margin:10px 0 0; font-size:32px; font-weight:900; color:#ea580c; letter-spacing:4px;">{{promoCode}}</p>
    </div>
    <a href="https://olivomarket.cl/ofertas" class="button" style="background-color:#f97316;">¡APROVECHAR!</a>
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

  const { subject: dbSubject, html: dbHtml } = await getTemplate(
    "order_confirmation",
    `✅ Pedido confirmado #${data.orderId}`,
    ORDER_CONFIRMATION_TEMPLATE
  );

  const html = renderTemplate(dbHtml, {
    customerName: data.customerName,
    orderId: data.orderId,
    total: `$${data.total.toLocaleString("es-CL")}`,
    itemCount: data.itemCount,
    paymentMethod: data.paymentMethod,
    itemsTable: itemsHtml,
    whatsappLink: `https://wa.me/56912345678?text=Hola%20OlivoMarket!%20Pedido%20%23${data.orderId}`,
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: renderTemplate(dbSubject, { orderId: data.orderId }),
    html,
    templateSlug: "order_confirmation",
    metadata: { orderId: data.orderId, total: data.total },
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
  const html = renderTemplate(REVIEW_REQUEST_TEMPLATE, {
    customerName: data.customerName,
    orderId: data.orderId,
    reviewLink: `https://olivomarket.cl/feedback/${data.orderId}`,
    whatsappLink: "https://wa.me/56912345678",
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

/** Order Status Update */
export async function sendOrderStatusEmail(data: {
  to: string;
  customerName: string;
  orderId: string;
  status: string;
  address: string;
}): Promise<EmailResult> {
  const { subject: dbSubject, html: dbHtml } = await getTemplate(
    "order_status_update",
    `📦 Actualización de tu pedido #${data.orderId}`,
    ORDER_STATUS_TEMPLATE
  );

  const html = renderTemplate(dbHtml, {
    customerName: data.customerName,
    orderId: data.orderId,
    status: data.status,
    address: data.address,
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
    console.warn("[Email] ⚠️ Log error:", err);
  }
}
