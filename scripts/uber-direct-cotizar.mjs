#!/usr/bin/env node
/**
 * Pide una cotización real a Uber Direct y la compara con lo que cobramos hoy.
 *
 * Existe porque la pregunta que decide si Uber Direct sirve no es técnica sino
 * de plata: hoy el checkout cobra un tope de $1.500 en Ñuñoa y Macul
 * (TOPE_POR_COMUNA en src/lib/shipping-policy.ts). Si Uber cobra más que eso,
 * cada pedido con despacho pierde plata, y no hay integración que lo arregle.
 *
 * Se corre desde tu máquina, no desde el contenedor del agente: la política de
 * egreso de ese entorno bloquea api.uber.com y auth.uber.com con 403.
 *
 *   node scripts/uber-direct-cotizar.mjs "Irarrázaval 3400, Ñuñoa"
 *
 * Lee las credenciales de .env.local (que está en .gitignore) o del entorno:
 *   UBER_DIRECT_CUSTOMER_ID, UBER_DIRECT_CLIENT_ID, UBER_DIRECT_CLIENT_SECRET
 */

import { readFileSync, existsSync } from "node:fs";

// ── Origen: el local. Los mismos datos que usa el SEO local, para que la
// cotización salga desde la dirección real y no desde una inventada.
const LOCAL = {
  calle: "Av. José Pedro Alessandri 2010, Local A",
  comuna: "Ñuñoa",
  region: "Región Metropolitana",
  codigoPostal: "7800280",
  pais: "CL",
  lat: -33.472904287482656,
  lng: -70.59850517606597,
  telefono: "+56920639745",
};

/** Lo que el checkout le cobra hoy al cliente en las comunas cercanas. */
const TOPE_ACTUAL_CLP = 1500;

function cargarEnvLocal() {
  if (!existsSync(".env.local")) return;
  for (const linea of readFileSync(".env.local", "utf-8").split("\n")) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const valor = m[2].replace(/^["']|["']$/g, "");
    if (!process.env[m[1]]) process.env[m[1]] = valor;
  }
}

async function obtenerToken(clientId, clientSecret) {
  // El endpoint de token está limitado a 100 pedidos por hora. Para un script
  // manual da de sobra, pero la integración real tiene que cachear el token.
  const r = await fetch("https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
  });
  const cuerpo = await r.text();
  if (!r.ok) throw new Error(`Autenticación falló (HTTP ${r.status}): ${cuerpo}`);
  const { access_token, expires_in } = JSON.parse(cuerpo);
  if (!access_token) throw new Error(`Sin access_token en la respuesta: ${cuerpo}`);
  return { token: access_token, expiraEn: expires_in };
}

async function cotizar({ token, customerId, destino }) {
  // Ojo: pickup_address y dropoff_address van como STRING con JSON adentro,
  // no como objeto. Mandarlos como objeto devuelve 400 sin explicar por qué.
  const direccion = (o) => JSON.stringify({
    street_address: [o.calle, ""],
    city: o.comuna,
    state: o.region,
    zip_code: o.codigoPostal,
    country: o.pais,
  });

  const cuerpo = {
    pickup_address: direccion(LOCAL),
    pickup_latitude: LOCAL.lat,
    pickup_longitude: LOCAL.lng,
    pickup_phone_number: LOCAL.telefono,
    dropoff_address: direccion(destino),
    ...(destino.lat != null ? { dropoff_latitude: destino.lat } : {}),
    ...(destino.lng != null ? { dropoff_longitude: destino.lng } : {}),
    dropoff_phone_number: destino.telefono || LOCAL.telefono,
  };

  const url = `https://api.uber.com/v1/customers/${customerId}/delivery_quotes`;
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`Cotización falló (HTTP ${r.status}):\n${texto}`);
  return JSON.parse(texto);
}

const pesos = (n) => "$" + Math.round(n).toLocaleString("es-CL");

async function main() {
  cargarEnvLocal();
  const faltan = ["UBER_DIRECT_CUSTOMER_ID", "UBER_DIRECT_CLIENT_ID", "UBER_DIRECT_CLIENT_SECRET"]
    .filter((k) => !process.env[k]);
  if (faltan.length) {
    console.error(`Faltan variables: ${faltan.join(", ")}`);
    console.error("Ponelas en .env.local (está en .gitignore) o en el entorno.");
    process.exit(1);
  }

  const calle = process.argv[2] || "Av. Irarrázaval 3400";
  const comuna = process.argv[3] || "Ñuñoa";
  const destino = { calle, comuna, region: "Región Metropolitana", codigoPostal: "7750000", pais: "CL" };

  console.log(`Desde: ${LOCAL.calle}, ${LOCAL.comuna}`);
  console.log(`Hasta: ${destino.calle}, ${destino.comuna}\n`);

  const { token, expiraEn } = await obtenerToken(
    process.env.UBER_DIRECT_CLIENT_ID, process.env.UBER_DIRECT_CLIENT_SECRET);
  console.log(`Token obtenido (vence en ${expiraEn}s)\n`);

  const q = await cotizar({ token, customerId: process.env.UBER_DIRECT_CUSTOMER_ID, destino });

  console.log("── Cotización ──");
  console.log(`id:        ${q.id}`);
  console.log(`fee crudo: ${q.fee}   moneda: ${q.currency || q.currency_type || "?"}`);
  console.log(`ETA:       ${q.dropoff_eta ?? "?"}   vence: ${q.expires ?? "?"}`);

  // El `fee` viene en la unidad mínima de la moneda. El peso chileno no tiene
  // centavos, así que no está claro de antemano si Uber divide por 100 o no.
  // Se muestran las dos lecturas: el número real desambigua solo.
  console.log("\n── Cuánto es eso ──");
  console.log(`  si el fee ya está en pesos:  ${pesos(q.fee)}`);
  console.log(`  si viene en centavos (/100): ${pesos(q.fee / 100)}`);

  console.log(`\n── Contra lo que cobramos hoy (tope ${pesos(TOPE_ACTUAL_CLP)} en Ñuñoa/Macul) ──`);
  for (const [etiqueta, costo] of [["en pesos", q.fee], ["en centavos", q.fee / 100]]) {
    const dif = costo - TOPE_ACTUAL_CLP;
    console.log(`  ${etiqueta.padEnd(12)} ${dif > 0 ? `perdemos ${pesos(dif)} por pedido` : `nos sobran ${pesos(-dif)}`}`);
  }

  console.log("\n── Respuesta completa ──");
  console.log(JSON.stringify(q, null, 2));
}

main().catch((e) => { console.error("\n" + e.message); process.exit(1); });
