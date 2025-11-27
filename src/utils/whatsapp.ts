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

export function buildSingleProductLink(phone: string, product: { name: string; price: number }, quantity = 1, currency = "$") {
  return buildWhatsAppOrderLink({
    phone,
    items: [{ name: product.name, price: product.price, quantity }],
  });
}
