// @vitest-environment node
//
// Corre en node y no en jsdom, que es el entorno por defecto del proyecto: el
// `URLSearchParams` de jsdom no es el que espera el `fetch` de undici, y el
// pedido del token falla con un error que no ocurre en producción — Next corre
// en node. Es un artefacto del entorno de prueba, no del cliente.

/**
 * Prueba de integración contra la API real de Uber Direct.
 *
 * Se salta sola cuando no hay credenciales, que es el caso en CI y en
 * cualquier clon recién bajado. Existe porque el resto de los tests del flash
 * son puros: verifican las reglas, pero no que el cuerpo que se le manda a
 * Uber sea el que Uber acepta. Esa parte ya rompió una vez —las direcciones
 * van como string con JSON adentro, no como objeto— y sólo se detecta
 * llamando.
 *
 * Para correrla: poné las credenciales en `.env.local` y `npx vitest run
 * src/__tests__/uber-direct.integracion.test.ts`.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, readFileSync } from "node:fs";

function cargarEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const linea of readFileSync(".env.local", "utf-8").split("\n")) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
cargarEnvLocal();

const hayCredenciales = Boolean(
  process.env.UBER_DIRECT_CUSTOMER_ID &&
    process.env.UBER_DIRECT_CLIENT_ID &&
    process.env.UBER_DIRECT_CLIENT_SECRET
);

describe.skipIf(!hayCredenciales)("Uber Direct, contra la API real", () => {
  let cotizarFlash: typeof import("@/server/uber-direct.service").cotizarFlash;
  let uberDirectConfigurado: typeof import("@/server/uber-direct.service").uberDirectConfigurado;

  beforeAll(async () => {
    const mod = await import("@/server/uber-direct.service");
    cotizarFlash = mod.cotizarFlash;
    uberDirectConfigurado = mod.uberDirectConfigurado;
  });

  it("se reconoce configurado", () => {
    expect(uberDirectConfigurado()).toBe(true);
  });

  it("cotiza una dirección de Ñuñoa y devuelve pesos, no centavos", async () => {
    const q = await cotizarFlash({
      calle: "Av. Irarrázaval 3400",
      comuna: "Ñuñoa",
      codigoPostal: "7750000",
    });

    expect(q).not.toBeNull();
    expect(q!.quoteId).toMatch(/^dqt_/);
    // El rango de un delivery en Santiago. Si el divisor por 100 se rompiera,
    // esto daría cientos de miles y fallaría acá.
    expect(q!.costoCLP).toBeGreaterThan(1000);
    expect(q!.costoCLP).toBeLessThan(15000);
  }, 20000);

  it("reutiliza el token en vez de pedir uno por cotización", async () => {
    // El endpoint de token admite 100 pedidos por hora: sin caché, cien
    // visitas al checkout dejarían la tienda sin poder cotizar.
    const { _resetTokenCache } = await import("@/server/uber-direct.service");
    _resetTokenCache();

    const llamadasAlToken: string[] = [];
    const fetchOriginal = globalThis.fetch;
    globalThis.fetch = ((url: RequestInfo | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("auth.uber.com")) llamadasAlToken.push(u);
      return fetchOriginal(url as string, init);
    }) as typeof fetch;

    try {
      const destino = { calle: "Av. Grecia 1570", comuna: "Ñuñoa", codigoPostal: "7750000" };
      await cotizarFlash(destino);
      await cotizarFlash(destino);
      expect(llamadasAlToken).toHaveLength(1);
    } finally {
      globalThis.fetch = fetchOriginal;
    }
  }, 30000);

  it("una dirección sin cobertura devuelve null, no una excepción", async () => {
    // Medido: Uber no cubre Puente Alto desde el local. Que sea `null` y no un
    // error es lo que le permite al checkout mostrar las otras dos opciones
    // en vez de romperse.
    const q = await cotizarFlash({
      calle: "Av. Concha y Toro 500",
      comuna: "Puente Alto",
      codigoPostal: "8150000",
      lat: -33.598,
      lng: -70.576,
    });
    expect(q).toBeNull();
  }, 20000);
});
