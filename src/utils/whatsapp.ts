/**
 * Mensajes de WhatsApp de la tienda.
 *
 * Quien escribe por WhatsApp normalmente ya tiene un problema concreto: un
 * pedido que no llegó, un producto que quiere encargar, una duda del carrito.
 * Un "Hola, tengo una consulta" obliga a preguntarlo todo de nuevo y alarga la
 * atención. Estos mensajes llevan el contexto ya escrito para que la primera
 * respuesta pueda resolver.
 */

/** Pesos chilenos: sin decimales y con separador de miles. */
const clp = (n: number) => `$${Math.round(n).toLocaleString("es-CL")}`;

/**
 * Normaliza un teléfono configurado por el admin al formato que exige wa.me
 * (solo dígitos, con código de país). Acepta "+56 9 1234 5678", "56912345678"
 * o "9 1234 5678" — a este último le antepone el código de Chile.
 */
export function normalizeWhatsAppPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("56")) return digits;
  // Número chileno sin código de país (9XXXXXXXX)
  if (digits.length === 9 && digits.startsWith("9")) return `56${digits}`;
  return digits;
}

/**
 * Enlace de WhatsApp a partir del teléfono configurado en la tienda.
 * Devuelve "#" si el teléfono no está configurado, para que la UI pueda
 * ocultar el botón en vez de enlazar a un número inventado.
 */
export function whatsappLink(phone: string | null | undefined, message: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return "#";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

type LineItem = { name: string; quantity: number; price: number };

/** Lista de productos en texto plano, una línea por ítem. */
function itemLines(items: LineItem[]): string {
  return items
    .map((i) => `• ${i.quantity} × ${i.name} — ${clp(i.price * i.quantity)}`)
    .join("\n");
}

/**
 * Consulta sobre el carrito, con el detalle incluido.
 * Sin el detalle, atender obliga a pedirle al cliente que lo transcriba.
 */
export function cartInquiryMessage(items: LineItem[], total: number): string {
  if (items.length === 0) {
    return "Hola! Quiero hacer una consulta antes de comprar en OlivoMarket.";
  }
  return [
    "Hola! Tengo una consulta sobre mi carrito en OlivoMarket:",
    "",
    itemLines(items),
    "",
    `Total: ${clp(total)}`,
  ].join("\n");
}

/** Consulta durante el checkout, antes de pagar. */
export function checkoutInquiryMessage(items: LineItem[], total: number): string {
  if (items.length === 0) {
    return "Hola! Estoy en el checkout de OlivoMarket y tengo una consulta.";
  }
  return [
    "Hola! Estoy por finalizar esta compra en OlivoMarket y tengo una consulta:",
    "",
    itemLines(items),
    "",
    `Total: ${clp(total)}`,
  ].join("\n");
}

/**
 * Consulta sobre un pedido ya hecho. El número corto es el que el cliente ve
 * en pantalla y en su email, así que sirve para buscarlo sin más preguntas.
 */
export function orderInquiryMessage(params: {
  shortId: string;
  total?: number;
  status?: string;
}): string {
  const lines = [`Hola! Tengo una consulta sobre mi pedido #${params.shortId} de OlivoMarket.`];
  if (typeof params.total === "number" && params.total > 0) {
    lines.push(`Total: ${clp(params.total)}`);
  }
  if (params.status) {
    lines.push(`Estado que veo: ${params.status}`);
  }
  return lines.join("\n");
}

/** Consulta o encargo de un producto concreto desde su ficha. */
export function productInquiryMessage(
  product: { name: string; price: number },
  quantity = 1
): string {
  return [
    "Hola! Quiero consultar por este producto de OlivoMarket:",
    "",
    `• ${quantity} × ${product.name} — ${clp(product.price * quantity)}`,
    "",
    "¿Está disponible?",
  ].join("\n");
}

// ── Compatibilidad con los llamados existentes ─────────────────────────────

/** Enlace con el resumen del carrito. `phone` incluye código de país. */
export function buildWhatsAppOrderLink(params: {
  phone: string;
  items: LineItem[];
  note?: string;
}): string {
  const total = params.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const message = params.note
    ? `${cartInquiryMessage(params.items, total)}\n\nNota: ${params.note}`
    : cartInquiryMessage(params.items, total);
  return whatsappLink(params.phone, message);
}

export function buildSingleProductLink(
  phone: string,
  product: { name: string; price: number },
  quantity = 1
): string {
  return whatsappLink(phone, productInquiryMessage(product, quantity));
}
