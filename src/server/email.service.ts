import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabase-server";

// ── Singleton Resend client ─────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

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
    const { data, error } = await resend.emails.send({
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

// ── Pre-built email senders ─────────────────────────────────────────────

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
        <div style="display:flex;align-items:center;gap:12px">
          ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;flex-shrink:0;border:1px solid #f3f4f6" />` : `<div style="width:48px;height:48px;border-radius:10px;background:#f9fafb;display:flex;align-items:center;justify-content:center;color:#d1d5db;font-size:10px">N/A</div>`}
          <div>
            <p style="margin:0;font-size:14px;font-weight:700;color:#111827;line-clamp:2">${item.name}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#6b7280">${item.quantity} un. x $${item.price.toLocaleString("es-CL")}</p>
          </div>
        </div>
      </td>
      <td style="padding:16px 12px;border-bottom:1px solid #f3f4f6;font-size:15px;color:#111827;font-weight:800;text-align:right">$${(item.price * item.quantity).toLocaleString("es-CL")}</td>
    </tr>`
    )
    .join("");

  const html = renderTemplate(ORDER_CONFIRMATION_TEMPLATE, {
    customerName: data.customerName,
    orderId: data.orderId,
    total: `$${data.total.toLocaleString("es-CL")}`,
    itemCount: data.itemCount,
    paymentMethod: data.paymentMethod,
    itemsTable: itemsHtml,
    whatsappLink: `https://wa.me/56912345678?text=Hola%20OlivoMarket!%20Tengo%20una%20consulta%20sobre%20mi%20pedido%20%23${data.orderId}`,
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: `✅ Pedido confirmado #${data.orderId}`,
    html,
    templateSlug: "order_confirmation",
    metadata: { orderId: data.orderId, total: data.total },
  });
}

/** Send POS receipt (boleta digital) */
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
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151">${item.name}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:center">${item.quantity}</td>
      <td style="padding:6px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#374151;text-align:right">$${item.price.toLocaleString("es-CL")}</td>
    </tr>`
    )
    .join("");

  const paymentDetails =
    data.paymentMethod === "cash" && data.cashReceived
      ? `<p style="margin:4px 0;font-size:13px;color:#6B7280">Efectivo recibido: $${data.cashReceived.toLocaleString("es-CL")}</p>
         <p style="margin:4px 0;font-size:13px;color:#10B981;font-weight:600">Vuelto: $${(data.changeGiven || 0).toLocaleString("es-CL")}</p>`
      : "";

  const html = renderTemplate(POS_RECEIPT_TEMPLATE, {
    customerName: data.customerName || "Cliente",
    saleId: String(data.saleId),
    total: `$${data.total.toLocaleString("es-CL")}`,
    paymentMethod: data.paymentMethod,
    paymentDetails,
    itemsTable: itemsHtml,
    date: new Date().toLocaleString("es-CL", {
      dateStyle: "long",
      timeStyle: "short",
    }),
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: `🧾 Boleta OlivoMarket #${data.saleId}`,
    html,
    templateSlug: "pos_receipt",
    metadata: { saleId: data.saleId, total: data.total },
  });
}

/** Send welcome email */
export async function sendWelcomeEmail(data: {
  to: string;
  customerName: string;
  couponCode?: string;
  bonusPoints?: number;
}): Promise<EmailResult> {
  const couponBlock = data.couponCode
    ? `<div style="background:#ECFDF5;border:2px dashed #10B981;border-radius:12px;padding:20px;text-align:center;margin:20px 0">
        <p style="margin:0 0 8px;font-size:13px;color:#065F46;font-weight:600">🎁 Tu cupón de bienvenida:</p>
        <p style="margin:0;font-size:28px;font-weight:900;color:#059669;letter-spacing:3px">${data.couponCode}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#6B7280">Úsalo en tu primera compra</p>
      </div>`
    : "";

  const pointsBlock = data.bonusPoints
    ? `<p style="font-size:14px;color:#374151;margin:12px 0">🌟 ¡Te regalamos <strong>${data.bonusPoints} puntos</strong> de bienvenida!</p>`
    : "";

  const html = renderTemplate(WELCOME_TEMPLATE, {
    customerName: data.customerName,
    couponBlock,
    pointsBlock,
    year: new Date().getFullYear(),
  });

  return sendEmail({
    to: data.to,
    toName: data.customerName,
    subject: `¡Bienvenido/a a OlivoMarket, ${data.customerName}! 🌿`,
    html,
    templateSlug: "welcome",
    metadata: { couponCode: data.couponCode || "" },
  });
}

/** Send abandoned cart reminder */
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
          <img src="${item.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100'}" style="width:50px;height:50px;border-radius:8px;object-fit:cover;margin-right:12px" />
          <div style="flex:1">
            <p style="margin:0;font-size:14px;font-weight:700;color:#111827">${item.name}</p>
            <p style="margin:0;font-size:12px;color:#059669">$${item.price.toLocaleString("es-CL")}</p>
          </div>
        </div>`
    )
    .join("");

  const couponBlock = data.discountCode
    ? `<div style="background:#FFFBEB;border:2px dashed #F59E0B;border-radius:12px;padding:16px;text-align:center;margin:20px 0">
        <p style="margin:0 0 4px;font-size:11px;color:#B45309;font-weight:800;text-transform:uppercase">Regalo para ti:</p>
        <p style="margin:0;font-size:24px;font-weight:900;color:#D97706">${data.discountCode}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#92400E">Usa este código para un 10% de descuento extra</p>
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
    subject: `🛒 ¡Tus productos OlivoMarket te extrañan!`,
    html,
    templateSlug: "abandoned_cart",
  });
}

// ── Email logging ───────────────────────────────────────────────────────
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
    // Non-critical: log but don't throw
    console.warn("[Email] ⚠️ Could not log email:", err);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// INLINE TEMPLATES (HTML emails)
// ═══════════════════════════════════════════════════════════════════════

const BASE_STYLES = `
  body { margin:0; padding:0; background:#f9fafb; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
  .container { max-width:600px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
  .header { background:linear-gradient(135deg,#064E3B 0%,#059669 100%); padding:32px 24px; text-align:center; }
  .header h1 { color:#ffffff; font-size:24px; margin:0; font-weight:900; letter-spacing:1px; }
  .header p { color:#A7F3D0; font-size:13px; margin:8px 0 0; }
  .content { padding:32px 24px; }
  .footer { background:#F9FAFB; padding:20px 24px; text-align:center; border-top:1px solid #E5E7EB; }
  .footer p { font-size:11px; color:#9CA3AF; margin:4px 0; }
  .btn { display:inline-block; background:#10B981; color:#ffffff; font-weight:700; font-size:14px; padding:12px 32px; border-radius:8px; text-decoration:none; }
`;

const ORDER_CONFIRMATION_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body style="margin:0;padding:20px;background:#f9fafb">
<div class="container" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.05);border:1px solid #f3f4f6">
  <div class="header" style="background:linear-gradient(135deg,#064E3B 0%,#059669 100%);padding:48px 32px;text-align:center;position:relative">
    <div style="background:rgba(255,255,255,0.1);padding:10px 20px;border-radius:100px;display:inline-block;margin-bottom:16px;font-size:11px;color:#ffffff;font-weight:900;letter-spacing:2px;text-transform:uppercase">Pedido Confirmado ✅</div>
    <h1 style="color:#ffffff;font-size:32px;margin:0;font-weight:900;letter-spacing:-1px">OLIVOMARKET</h1>
    <p style="color:#A7F3D0;font-size:14px;margin:8px 0 0;font-weight:500 opacity:0.9">Tu compra está siendo preparada con amor.</p>
  </div>
  <div class="content" style="padding:40px 32px">
    <h2 style="color:#111827;font-size:24px;margin:0 0 8px;font-weight:900">¡Gracias por elegirnos, {{customerName}}!</h2>
    <p style="color:#6B7280;font-size:15px;margin:0 0 32px;line-height:1.6">Es un gusto saludarte. Hemos recibido tu pedido <strong>#{{orderId}}</strong> con éxito. Aquí tienes el detalle de lo que está por llegar a tu puerta:</p>
    
    <table style="width:100%;border-collapse:collapse;margin:0">
      <thead>
        <tr>
          <th style="padding:12px 12px;text-align:left;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #f3f4f6">Producto</th>
          <th style="padding:12px 12px;text-align:right;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;border-bottom:2px solid #f3f4f6">Total</th>
        </tr>
      </thead>
      <tbody>{{itemsTable}}</tbody>
    </table>
    
    <div style="background:#f9fafb;border-radius:20px;padding:32px;text-align:center;margin:32px 0;border:1px solid #f3f4f6">
      <p style="margin:0 0 6px;font-size:11px;color:#10B981;text-transform:uppercase;letter-spacing:2px;font-weight:900">Monto total pagado</p>
      <p style="margin:0;font-size:42px;font-weight:900;color:#064E3B;letter-spacing:-1px">{{total}}</p>
      <div style="margin:16px auto 0;height:4px;width:40px;background:#10B981;border-radius:100px"></div>
      <p style="margin:16px 0 0;font-size:13px;color:#6B7280;font-weight:600 italic">Pago vía {{paymentMethod}} · {{itemCount}} productos</p>
    </div>

    <div style="text-align:center;margin-top:40px">
      <p style="font-size:14px;color:#9ca3af;margin-bottom:20px;font-weight:500">¿Tienes dudas con este pedido?</p>
      <a href="{{whatsappLink}}" style="display:inline-block;background:#25D366;color:#ffffff;font-size:15px;font-weight:900;padding:18px 40px;border-radius:100px;text-decoration:none;box-shadow:0 8px 20px rgba(37,211,102,0.2)">Hablar por WhatsApp →</a>
    </div>
  </div>
  <div class="footer" style="background:#f9fafb;padding:32px;text-align:center;border-top:1px solid #f3f4f6">
    <p style="font-size:13px;color:#111827;font-weight:800;margin-bottom:4px">OlivoMarket Gourmet</p>
    <p style="font-size:12px;color:#9ca3af;margin:0">Santiago, Región Metropolitana, Chile</p>
    <p style="font-size:11px;color:#d1d5db;margin-top:16px">© {{year}} OlivoMarket. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;

const POS_RECEIPT_TEMPLATE = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body style="margin:0;padding:20px;background:#f9fafb">
<div class="container">
  <div class="header" style="padding:24px">
    <h1 style="font-size:20px">OLIVO<span style="font-style:italic;color:#A7F3D0">MARKET</span></h1>
    <p>Boleta Electrónica</p>
  </div>
  <div class="content" style="padding:24px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;font-weight:700">Boleta</p>
        <p style="margin:0;font-size:18px;font-weight:900;color:#064E3B">#{{saleId}}</p>
      </div>
      <p style="margin:0;font-size:12px;color:#6B7280">{{date}}</p>
    </div>
    
    <p style="font-size:14px;color:#374151;margin:0 0 16px">Hola <strong>{{customerName}}</strong>, aquí está tu boleta:</p>

    <table style="width:100%;border-collapse:collapse;margin:12px 0">
      <thead>
        <tr style="background:#F9FAFB">
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1px">Producto</th>
          <th style="padding:8px 12px;text-align:center;font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1px">Cant.</th>
          <th style="padding:8px 12px;text-align:right;font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1px">Precio</th>
        </tr>
      </thead>
      <tbody>{{itemsTable}}</tbody>
    </table>
    
    <div style="background:#064E3B;border-radius:10px;padding:16px;text-align:center;margin:16px 0">
      <p style="margin:0 0 4px;font-size:10px;color:#A7F3D0;text-transform:uppercase;letter-spacing:2px;font-weight:700">Total</p>
      <p style="margin:0;font-size:28px;font-weight:900;color:#ffffff">{{total}}</p>
      <p style="margin:6px 0 0;font-size:11px;color:#A7F3D0">{{paymentMethod}}</p>
    </div>
    {{paymentDetails}}
  </div>
  <div class="footer">
    <p>¡Gracias por tu compra! 🌿</p>
    <p>© {{year}} OlivoMarket</p>
  </div>
</div>
</body></html>`;

const WELCOME_TEMPLATE = `...`; // (Keep existing)

const ABANDONED_CART_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body style="margin:0;padding:20px;background:#f9fafb">
<div class="container" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.05)">
  <div class="header" style="background:#064E3B;padding:40px;text-align:center">
    <h1 style="color:#ffffff;font-size:28px;margin:0;font-weight:900">¿TE OLVIDASTE DE ALGO? 🛒</h1>
  </div>
  <div class="content" style="padding:40px 32px;text-align:center">
    <h2 style="color:#111827;font-size:20px;margin:0 0 12px;font-weight:800">¡Hola, {{customerName}}!</h2>
    <p style="color:#6B7280;font-size:15px;margin:0 0 24px;line-height:1.6">Notamos que dejaste algunos tesoros en tu carrito. Los hemos guardado para ti, pero no durarán mucho tiempo.</p>
    
    <div style="text-align:left;margin-bottom:32px">
      <p style="font-size:11px;font-weight:900;color:#9ca3af;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px">En tu carrito quedó:</p>
      {{itemsHtml}}
    </div>

    {{couponBlock}}

    <div style="margin-top:32px">
      <a href="{{cartUrl}}" style="display:inline-block;background:#10B981;color:#ffffff;font-size:16px;font-weight:900;padding:20px 48px;border-radius:100px;text-decoration:none;box-shadow:0 10px 20px rgba(16,185,129,0.2)">VOLVER A MI CARRITO →</a>
    </div>
  </div>
  <div class="footer" style="background:#f9fafb;padding:32px;text-align:center">
    <p style="font-size:12px;color:#9ca3af;margin:0">OlivoMarket · Calidad Gourmet en tu Puerta</p>
    <p style="font-size:11px;color:#d1d5db;margin-top:8px">© {{year}} OlivoMarket. Todos los derechos reservados.</p>
  </div>
</div>
</body></html>`;

const SUPPLIER_ORDER_TEMPLATE = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><style>${BASE_STYLES}</style></head>
<body style="margin:0;padding:20px;background:#f9fafb">
<div class="container" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.05)">
  <div class="header" style="background:#064E3B;padding:40px;text-align:center">
    <h1 style="color:#ffffff;font-size:28px;margin:0;font-weight:900">NUEVA ORDEN DE COMPRA</h1>
    <p style="color:#D1FAE5;margin:8px 0 0;font-size:14px">OlivoMarket SPA.</p>
  </div>
  <div class="content" style="padding:40px 32px">
    <div style="display:flex;justify-content:space-between;border-bottom:2px dashed #e5e7eb;padding-bottom:16px;margin-bottom:24px">
      <div>
        <p style="margin:0;font-size:12px;color:#9CA3AF;text-transform:uppercase;letter-spacing:1px;font-weight:700">Orden N°</p>
        <p style="margin:0;font-size:18px;font-weight:900;color:#064E3B">{{orderId}}</p>
      </div>
      <div style="text-align:right">
        <p style="margin:0;font-size:12px;color:#6B7280">Entrega Esperada:</p>
        <p style="margin:0;font-size:14px;font-weight:bold;color:#374151">{{expectedDate}}</p>
      </div>
    </div>
    
    <p style="font-size:14px;color:#374151;margin:0 0 16px">Hola <strong>{{supplierName}}</strong>, adjuntamos a continuación el detalle de los productos requeridos:</p>

    <table style="width:100%;border-collapse:collapse;margin:12px 0">
      <thead>
        <tr style="background:#F9FAFB">
          <th style="padding:8px 12px;text-align:left;font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1px">Producto / SKU</th>
          <th style="padding:8px 12px;text-align:center;font-size:10px;color:#6B7280;text-transform:uppercase;letter-spacing:1px">Cant.</th>
        </tr>
      </thead>
      <tbody>{{itemsTable}}</tbody>
    </table>
    
    {{notesBlock}}

    <div style="background:#F3F4F6;border-radius:10px;padding:16px;text-align:center;margin:24px 0">
      <p style="margin:0;font-size:12px;color:#4B5563;font-weight:bold">Por favor, confirmar recepción y disponibilidad.</p>
    </div>
  </div>
  <div class="footer" style="background:#f9fafb;padding:32px;text-align:center">
    <p style="font-size:12px;color:#9ca3af;margin:0">Depto. de Compras - OlivoMarket</p>
    <p style="font-size:11px;color:#d1d5db;margin-top:8px">Este es un correo autogenerado.</p>
  </div>
</div>
</body></html>`;

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
        <td style="padding:12px;font-size:13px;color:#111827">
          ${item.name}<br>
          <span style="font-size:10px;color:#6B7280">SKU: ${item.sku || "N/A"}</span>
        </td>
        <td style="padding:12px;font-size:13px;font-weight:800;color:#111827;text-align:center">
          ${item.quantity}
        </td>
      </tr>
    `;
  }

  const notesBlock = props.notes 
    ? `<div style="margin-top:16px;padding:12px;border-left:4px solid #F59E0B;background:#FEF3C7;font-size:12px;color:#92400E"><strong>Notas Extras:</strong><br>${props.notes}</div>`
    : '';

  const html = SUPPLIER_ORDER_TEMPLATE
    .replace("{{orderId}}", props.orderId.substring(0, 8).toUpperCase())
    .replace("{{supplierName}}", props.supplierName)
    .replace("{{expectedDate}}", props.expectedDate)
    .replace("{{itemsTable}}", itemsTable)
    .replace("{{notesBlock}}", notesBlock);

  return sendEmail({
    to: props.toEmail,
    toName: props.supplierName,
    subject: `Orden de Compra #${props.orderId.substring(0,8).toUpperCase()} - OlivoMarket`,
    html,
    templateSlug: "supplier_order",
    metadata: { orderId: props.orderId },
  });
}
