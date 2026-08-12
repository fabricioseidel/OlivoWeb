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
 * Devuelve null si el teléfono no está configurado, para que la UI pueda
 * ocultar el botón en vez de enlazar a un número inventado.
 */
export function whatsappLink(phone: string | null | undefined, message: string): string {
  const normalized = normalizeWhatsAppPhone(phone);
  if (!normalized) return "#";
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

// Genera un enlace de WhatsApp con el resumen del carrito o producto.
// phone debe incluir código de país (sin +) p.ej. Chile: 569XXXXXXXX
export function buildWhatsAppOrderLink(params: {
  phone: string; // destino
  items: { name: string; quantity: number; price: number }[];
  note?: string;
  currency?: string; // símbolo (display)
}) {
  const { phone, items, note, currency = "$" } = params;
  const lines: string[] = [];
  lines.push("*Pedido OLIVOMARKET*%0A");
  let total = 0;
  items.forEach((it) => {
    const lineTotal = it.price * it.quantity;
    total += lineTotal;
    lines.push(`- ${it.quantity} x ${it.name} = ${currency} ${lineTotal.toFixed(2)}`);
  });
  lines.push("%0A");
  lines.push(`Total: ${currency} ${total.toFixed(2)}`);
  if (note) {
    lines.push("%0A");
    lines.push(`Nota: ${encodeURIComponent(note)}`);
  }
  const message = lines.join("%0A");
  return `https://wa.me/${phone}?text=${message}`;
}

export function buildSingleProductLink(phone: string, product: { name: string; price: number }, quantity = 1, _currency = "$") {
  return buildWhatsAppOrderLink({
    phone,
    items: [{ name: product.name, price: product.price, quantity }],
  });
}
