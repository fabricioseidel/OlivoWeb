/**
 * La URL pública con la que se le habla al mundo exterior.
 *
 * Una regla de una línea que ya costó dos veces: los eventos de Resend y
 * **todas** las confirmaciones de pago de MercadoPago.
 */
import { describe, it, expect } from "vitest";
import { normalizarUrlPublica } from "@/lib/site-url";
import { BUSINESS } from "@/lib/seo/business";

const CANONICA = BUSINESS.url;

describe("la URL pública que reciben MercadoPago y Resend", () => {
  it("corrige el dominio raíz, que es el que rompe los webhooks", () => {
    // El raíz responde 307. El navegador lo sigue —por eso el cliente aterriza
    // bien en la confirmación— pero quien notifica no: da el 307 por entregado
    // y el pedido se queda pendiente para siempre.
    expect(normalizarUrlPublica("https://olivomarket.cl")).toBe(CANONICA);
    expect(normalizarUrlPublica("https://olivomarket.cl/")).toBe(CANONICA);
    expect(normalizarUrlPublica("http://olivomarket.cl")).toBe(CANONICA);
  });

  it("deja el dominio canónico como está", () => {
    expect(normalizarUrlPublica(CANONICA)).toBe(CANONICA);
    expect(normalizarUrlPublica(`${CANONICA}/`)).toBe(CANONICA);
  });

  it("cae al canónico cuando la variable falta o es basura", () => {
    // Antes el respaldo era el dominio raíz, así que no definir la variable
    // producía exactamente el error que esto evita.
    expect(normalizarUrlPublica(undefined)).toBe(CANONICA);
    expect(normalizarUrlPublica("")).toBe(CANONICA);
    expect(normalizarUrlPublica("   ")).toBe(CANONICA);
    expect(normalizarUrlPublica("olivomarket punto cl")).toBe(CANONICA);
  });

  it("no toca un preview de Vercel", () => {
    // Ahí no hay redirección, y reescribirlo mandaría las pruebas a producción.
    const preview = "https://olivoweb-git-rama-fabricio.vercel.app";
    expect(normalizarUrlPublica(preview)).toBe(preview);
  });

  it("fuerza HTTPS: sin él MercadoPago ni acepta la preferencia", () => {
    expect(normalizarUrlPublica("http://staging.olivomarket.cl")).toBe(
      "https://staging.olivomarket.cl"
    );
  });

  it("respeta localhost en http, que es como se desarrolla", () => {
    expect(normalizarUrlPublica("http://localhost:3000")).toBe("http://localhost:3000");
  });
});
