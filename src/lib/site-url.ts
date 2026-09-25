/**
 * La URL pública con la que se le habla al mundo exterior.
 *
 * Existe por un error que ya ocurrió dos veces. El sitio se sirve en
 * `www.olivomarket.cl` y el dominio raíz responde **307**. Un navegador sigue
 * esa redirección sin que nadie lo note —por eso el cliente igual aterriza en
 * la pantalla de confirmación—, pero **los webhooks no la siguen**: quien
 * notifica recibe el 307, lo da por entregado y nunca reintenta contra el
 * destino real.
 *
 * Así se perdieron los eventos de Resend, y así se perdieron **todas** las
 * confirmaciones de pago de MercadoPago: `NEXT_PUBLIC_SITE_URL` apuntaba al
 * dominio raíz, el `notification_url` de cada preferencia salía sin `www`, y
 * ninguna orden llegó jamás a marcarse como pagada. El síntoma no se parece a
 * la causa: el cobro sale bien, el cliente vuelve bien, y el pedido se queda
 * pendiente para siempre.
 *
 * Módulo puro y probado: es una regla de una línea que cuesta caro olvidar.
 */

import { BUSINESS } from "@/lib/seo/business";

/**
 * Corrige una URL pública que apunte al dominio canónico sin `www`.
 *
 * Sólo toca ese caso. Un dominio de preview de Vercel se deja intacto: ahí la
 * redirección no existe y reescribirlo mandaría las pruebas a producción.
 */
export function normalizarUrlPublica(cruda?: string | null): string {
  const canonica = BUSINESS.url.replace(/\/+$/, "");
  const valor = String(cruda ?? "").trim().replace(/\/+$/, "");
  if (!valor) return canonica;

  let host: string;
  let protocolo: string;
  try {
    const u = new URL(valor);
    host = u.host.toLowerCase();
    protocolo = u.protocol;
  } catch {
    // Un valor que no es una URL no se puede arreglar; se usa la canónica
    // antes que construir un `notification_url` roto.
    return canonica;
  }

  const hostCanonico = new URL(canonica).host.toLowerCase();
  const hostDesnudo = hostCanonico.replace(/^www\./, "");

  // El caso que rompe: el dominio raíz, que redirige al canónico con 307.
  if (host === hostDesnudo) return canonica;

  // Todo lo demás —el canónico, un preview, un túnel local— se respeta. Sólo
  // se fuerza HTTPS, porque sin él MercadoPago ni siquiera acepta la
  // preferencia.
  if (protocolo !== "https:" && host !== "localhost" && !host.startsWith("localhost:")) {
    return valor.replace(/^https?:/, "https:");
  }
  return valor;
}

/** La URL pública que se le entrega a MercadoPago, Resend y demás. */
export function urlPublica(): string {
  return normalizarUrlPublica(process.env.NEXT_PUBLIC_SITE_URL);
}
