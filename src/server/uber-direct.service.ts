/**
 * Cliente de Uber Direct.
 *
 * Todo lo que habla por red con Uber vive acá; las reglas de negocio están en
 * `src/lib/flash-policy.ts`, que es puro y testeable sin tocar la API.
 *
 * El origen sale de `BUSINESS`, que es la fuente única del NAP: si el local se
 * muda, se corrige en un solo lugar y no queda una dirección vieja escondida
 * en el servicio de envíos.
 */

import { BUSINESS } from "@/lib/seo/business";
import { feeUberACLP } from "@/lib/flash-policy";

const AUTH_URL = "https://auth.uber.com/oauth/v2/token";
const API_BASE = "https://api.uber.com/v1/customers";

/** Si Uber no contesta en este tiempo, el checkout sigue sin el flash. */
const TIMEOUT_MS = 8000;

type Credenciales = { customerId: string; clientId: string; clientSecret: string };

function leerCredenciales(): Credenciales | null {
  const customerId = process.env.UBER_DIRECT_CUSTOMER_ID;
  const clientId = process.env.UBER_DIRECT_CLIENT_ID;
  const clientSecret = process.env.UBER_DIRECT_CLIENT_SECRET;
  if (!customerId || !clientId || !clientSecret) return null;
  return { customerId, clientId, clientSecret };
}

/** `true` si el flash está configurado. Sin credenciales, la opción no existe. */
export function uberDirectConfigurado(): boolean {
  return leerCredenciales() !== null;
}

/**
 * Token cacheado en memoria del proceso.
 *
 * El endpoint de token está limitado a 100 pedidos por hora, así que pedir uno
 * por cotización agotaría la cuota con 100 visitas. El token que devuelve dura
 * 30 días (medido: `expires_in` 2592000), de modo que una instancia caliente
 * pide uno y no vuelve a pedirlo.
 *
 * Es caché por instancia: en serverless cada una tendrá el suyo, y eso está
 * bien —son unas pocas llamadas por despliegue, no una por pedido—. Con más
 * tráfico del que hoy tiene la tienda convendría moverlo a un almacén
 * compartido.
 */
let tokenCache: { token: string; venceEn: number } | null = null;

/** Margen antes del vencimiento real, para no usar un token que expira en vuelo. */
const MARGEN_RENOVACION_MS = 60_000;

/** Sólo para los tests: olvida el token cacheado. */
export function _resetTokenCache(): void {
  tokenCache = null;
}

async function obtenerToken(cred: Credenciales): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.venceEn - MARGEN_RENOVACION_MS) {
    return tokenCache.token;
  }

  const r = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cred.clientId,
      client_secret: cred.clientSecret,
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!r.ok) {
    throw new Error(`Uber: autenticación falló (HTTP ${r.status})`);
  }
  const { access_token, expires_in } = await r.json();
  if (!access_token) throw new Error("Uber: la respuesta no trajo access_token");

  tokenCache = {
    token: access_token,
    venceEn: Date.now() + Number(expires_in || 3600) * 1000,
  };
  return access_token;
}

/**
 * Las direcciones van como STRING con JSON adentro, no como objeto.
 *
 * Mandarlas como objeto devuelve 400 sin explicar por qué. Está probado contra
 * la API real; no "simplificar" quitando el `JSON.stringify`.
 */
function direccionUber(o: {
  calle: string;
  comuna: string;
  region: string;
  codigoPostal: string;
}): string {
  return JSON.stringify({
    street_address: [o.calle, ""],
    city: o.comuna,
    state: o.region,
    zip_code: o.codigoPostal,
    country: "CL",
  });
}

const ORIGEN = {
  calle: BUSINESS.address.streetAddress,
  comuna: BUSINESS.address.addressLocality,
  region: BUSINESS.address.addressRegion,
  codigoPostal: BUSINESS.address.postalCode,
};

/**
 * Teléfono en E.164, que es lo único que Uber Direct acepta.
 *
 * El checkout manda el teléfono tal como lo escribe el cliente: en Chile eso
 * es "933030295" o "9 3303 0295". Uber responde `invalid_params` y la
 * cotización entera se cae, así que el envío flash desaparecía del checkout
 * apenas el cliente llenaba su teléfono — con el local abierto y las
 * credenciales bien. Cuando el número no se puede interpretar se usa el de la
 * tienda: es preferible una entrega que llega a un teléfono de contacto válido
 * a no ofrecer el servicio.
 */
export function telefonoE164(raw?: string | null): string {
  const digitos = String(raw ?? "").replace(/\D/g, "");
  if (!digitos) return BUSINESS.phoneE164;
  // Ya viene con código de país.
  if (digitos.startsWith("56") && digitos.length >= 11) return `+${digitos}`;
  // Móvil chileno sin código de país: 9XXXXXXXX.
  if (digitos.length === 9 && digitos.startsWith("9")) return `+56${digitos}`;
  // Fijo de Santiago sin código de país: 2XXXXXXXX.
  if (digitos.length === 9 && digitos.startsWith("2")) return `+56${digitos}`;
  // Escrito con el 0 de larga distancia: 09XXXXXXXX.
  if (digitos.length === 10 && digitos.startsWith("09")) return `+56${digitos.slice(1)}`;
  return BUSINESS.phoneE164;
}

export type DestinoFlash = {
  calle: string;
  comuna: string;
  codigoPostal?: string;
  lat?: number | null;
  lng?: number | null;
  telefono?: string | null;
};

export type CotizacionFlash = {
  quoteId: string;
  /** Costo en pesos chilenos, ya dividido por 100. */
  costoCLP: number;
  /** Minutos estimados hasta la entrega, si Uber los informó. */
  etaMin: number | null;
  /** Cuándo deja de valer la cotización (ISO). */
  expira: string | null;
};

/**
 * Pide una cotización a Uber.
 *
 * Devuelve `null` cuando Uber no cubre la dirección, que es una respuesta
 * legítima y no un error: la cobertura es un polígono con huecos —medido: Las
 * Condes a 4,4 km rebota y La Reina a 5,1 km no—, así que no se puede anticipar
 * con un radio y hay que preguntar.
 *
 * Lanza sólo cuando algo falló de verdad (red, credenciales, Uber caído), para
 * que el llamador pueda distinguir "acá no llegamos" de "no pudimos preguntar".
 */
export async function cotizarFlash(destino: DestinoFlash): Promise<CotizacionFlash | null> {
  const cred = leerCredenciales();
  if (!cred) throw new Error("Uber Direct no está configurado");

  const token = await obtenerToken(cred);

  const cuerpo: Record<string, unknown> = {
    pickup_address: direccionUber(ORIGEN),
    pickup_latitude: BUSINESS.geo.latitude,
    pickup_longitude: BUSINESS.geo.longitude,
    pickup_phone_number: BUSINESS.phoneE164,
    dropoff_address: direccionUber({
      calle: destino.calle,
      comuna: destino.comuna,
      region: BUSINESS.address.addressRegion,
      codigoPostal: destino.codigoPostal || BUSINESS.address.postalCode,
    }),
    dropoff_phone_number: telefonoE164(destino.telefono),
  };
  if (typeof destino.lat === "number") cuerpo.dropoff_latitude = destino.lat;
  if (typeof destino.lng === "number") cuerpo.dropoff_longitude = destino.lng;

  const r = await fetch(`${API_BASE}/${cred.customerId}/delivery_quotes`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const texto = await r.text();

  if (!r.ok) {
    let code = "";
    let detalle = "";
    try {
      const err = JSON.parse(texto);
      code = err?.code || "";
      // El `code` solo no alcanza para arreglar nada: `invalid_params` puede
      // ser el teléfono, la dirección o un customer_id que no corresponde a
      // las credenciales. Uber dice cuál en `message` y `metadata`, y perder
      // eso costó una tarde de tanteo.
      detalle = [err?.message, err?.metadata ? JSON.stringify(err.metadata) : ""]
        .filter(Boolean)
        .join(" ");
    } catch {
      // Cuerpo no-JSON: se conserva crudo, recortado.
      detalle = texto.slice(0, 300);
    }
    // Fuera del área de reparto de Uber. No es una falla: es un "no".
    if (code === "address_undeliverable") return null;
    throw new Error(
      `Uber: cotización falló (HTTP ${r.status}) ${code}${detalle ? ` — ${detalle}` : ""}`
    );
  }

  const q = JSON.parse(texto);
  const etaMin =
    q.dropoff_eta && q.created
      ? Math.round((new Date(q.dropoff_eta).getTime() - new Date(q.created).getTime()) / 60000)
      : typeof q.duration === "number"
        ? q.duration
        : null;

  return {
    quoteId: q.id,
    costoCLP: feeUberACLP(q.fee),
    etaMin,
    expira: q.expires ?? null,
  };
}

export type EntregaCreada = { id: string; tracking: string | null };

/**
 * Crea la entrega. Se llama **sólo con el pago ya confirmado** (regla 4).
 *
 * Antes de eso no: un pago fallido dejaría un repartidor en camino a buscar un
 * pedido que nadie pagó, y esa entrega se cobra igual.
 */
export async function crearEntregaFlash(params: {
  quoteId: string;
  destino: DestinoFlash;
  nombreCliente: string;
  telefonoCliente: string;
  referenciaPedido: string;
  /** Valor declarado del pedido en CLP, para el seguro de Uber. */
  valorPedidoCLP: number;
  instrucciones?: string | null;
}): Promise<EntregaCreada> {
  const cred = leerCredenciales();
  if (!cred) throw new Error("Uber Direct no está configurado");

  const token = await obtenerToken(cred);

  const r = await fetch(`${API_BASE}/${cred.customerId}/deliveries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      quote_id: params.quoteId,
      pickup_name: BUSINESS.name,
      pickup_address: direccionUber(ORIGEN),
      pickup_phone_number: BUSINESS.phoneE164,
      pickup_latitude: BUSINESS.geo.latitude,
      pickup_longitude: BUSINESS.geo.longitude,
      dropoff_name: params.nombreCliente,
      dropoff_address: direccionUber({
        calle: params.destino.calle,
        comuna: params.destino.comuna,
        region: BUSINESS.address.addressRegion,
        codigoPostal: params.destino.codigoPostal || BUSINESS.address.postalCode,
      }),
      dropoff_phone_number: telefonoE164(params.telefonoCliente),
      ...(params.instrucciones ? { dropoff_notes: params.instrucciones } : {}),
      manifest_reference: params.referenciaPedido,
      // El valor va en la unidad mínima, igual que el `fee` que Uber devuelve.
      manifest_total_value: Math.round(params.valorPedidoCLP * 100),
      manifest_items: [
        {
          name: `Pedido ${params.referenciaPedido}`,
          quantity: 1,
          size: "small",
        },
      ],
      // No se vende alcohol por la web, así que la verificación de edad de
      // Uber no aplica y no se pide.
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const texto = await r.text();
  if (!r.ok) throw new Error(`Uber: crear entrega falló (HTTP ${r.status}) ${texto.slice(0, 400)}`);

  const d = JSON.parse(texto);
  return { id: d.id, tracking: d.tracking_url ?? null };
}
