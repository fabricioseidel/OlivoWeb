/**
 * Cliente de Uber Direct.
 *
 * Solo servidor: usa el client secret, que no puede salir en un bundle del
 * navegador. Todo lo que el checkout necesite pasa por rutas de API.
 *
 * Flujo: token → cotización → envío → seguimiento por webhook.
 */

import { BUSINESS } from "@/lib/seo/business";

const TOKEN_URL = "https://login.uber.com/oauth/v2/token";
const API_BASE = "https://api.uber.com/v1/customers";

/** Margen antes del vencimiento real, para no usar un token recién expirado. */
const TOKEN_SAFETY_MARGIN_MS = 60_000;

export type UberAddress = {
  street_address: string[];
  city: string;
  state: string;
  zip_code?: string;
  country: string;
};

export type UberQuote = {
  id: string;
  /** Tarifa en CLP. */
  fee: number;
  /** Minutos estimados hasta la entrega, si Uber los informa. */
  etaMinutes: number | null;
  expiresAt: string | null;
};

export type UberDelivery = {
  id: string;
  status: string;
  trackingUrl: string | null;
  fee: number;
};

export type ManifestItem = {
  name: string;
  quantity: number;
  /** Precio unitario en CLP. */
  price?: number;
};

/**
 * Error de Uber con su código, para poder distinguir "esta dirección no tiene
 * cobertura" (no se ofrece la opción y ya) de "la API está caída" (se registra).
 */
export class UberDirectError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string | null
  ) {
    super(message);
    this.name = "UberDirectError";
  }

  /**
   * La dirección no es despachable: no hay cobertura, está fuera de rango o
   * Uber no la entiende. No es una falla nuestra ni algo que reintentar.
   *
   * La lista sale de los códigos documentados de la API; ante uno desconocido
   * se asume que sí es una falla, para que quede en los logs en vez de
   * desaparecer como "sin cobertura".
   */
  get esFaltaDeCobertura(): boolean {
    const sinCobertura = [
      "address_undeliverable",
      "address_undeliverable_limited_couriers",
      "unknown_location",
      "invalid_params",
      "pickup_deadline_too_early",
      "dropoff_deadline_too_early",
    ];
    return this.status === 400 && Boolean(this.code) && sinCobertura.includes(this.code!);
  }
}

/**
 * Montos.
 *
 * La API trabaja en la unidad mínima de la moneda. El peso chileno no tiene
 * decimales, así que aquí se pasa el valor tal cual. Está centralizado a
 * propósito: si la primera cotización real vuelve con un valor 100 veces mayor
 * al esperado, se corrige en estas dos funciones y no en cinco lugares.
 */
function toUberAmount(clp: number): number {
  return Math.round(clp);
}

function fromUberAmount(amount: number): number {
  return Math.round(amount);
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

/** ¿Está configurado Uber Direct? Sin esto la opción simplemente no se ofrece. */
export function uberDirectConfigurado(): boolean {
  return Boolean(
    process.env.UBER_DIRECT_CLIENT_ID &&
      process.env.UBER_DIRECT_CLIENT_SECRET &&
      process.env.UBER_DIRECT_CUSTOMER_ID
  );
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - TOKEN_SAFETY_MARGIN_MS) {
    return cachedToken.value;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: requiredEnv("UBER_DIRECT_CLIENT_ID"),
      client_secret: requiredEnv("UBER_DIRECT_CLIENT_SECRET"),
      grant_type: "client_credentials",
      scope: "eats.deliveries",
    }),
  });

  if (!res.ok) {
    throw new UberDirectError(
      `No se pudo obtener el token de Uber Direct (${res.status})`,
      res.status,
      null
    );
  }

  const data = await res.json();
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in ?? 2592000) * 1000,
  };
  return cachedToken.value;
}

async function uberFetch(path: string, init: { method: string; body?: unknown }): Promise<any> {
  const token = await getAccessToken();
  const customerId = requiredEnv("UBER_DIRECT_CUSTOMER_ID");

  const res = await fetch(`${API_BASE}/${customerId}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};

  if (!res.ok) {
    throw new UberDirectError(
      data.message || `Uber Direct respondió ${res.status}`,
      res.status,
      data.code ?? null
    );
  }

  return data;
}

/** Dirección del local, como punto de retiro. */
export function direccionRetiro(): UberAddress {
  return {
    street_address: [BUSINESS.address.streetAddress],
    city: BUSINESS.address.addressLocality,
    state: BUSINESS.address.addressRegion,
    zip_code: BUSINESS.address.postalCode,
    country: BUSINESS.address.addressCountry,
  };
}

/** Arma la dirección de destino a partir de los datos del checkout. */
export function direccionDestino(info: {
  address: string;
  city: string;
  state: string;
  zipCode?: string;
  apartment?: string;
  tower?: string;
}): UberAddress {
  const linea2 = [info.tower && `Torre ${info.tower}`, info.apartment && `Depto ${info.apartment}`]
    .filter(Boolean)
    .join(", ");

  return {
    street_address: linea2 ? [info.address, linea2] : [info.address],
    city: info.city,
    state: info.state || BUSINESS.address.addressRegion,
    zip_code: info.zipCode || undefined,
    country: "CL",
  };
}

/**
 * Cotiza un envío.
 *
 * La cotización dura pocos minutos: no sirve guardarla para usarla después del
 * pago. Se cotiza para mostrar el precio y se vuelve a cotizar al crear el
 * envío.
 */
export async function cotizarEnvio(params: {
  destino: UberAddress;
  /** Valor de la mercadería, para el seguro del envío. */
  valorPedido: number;
}): Promise<UberQuote> {
  const data = await uberFetch("/delivery_quotes", {
    method: "POST",
    body: {
      pickup_address: JSON.stringify(direccionRetiro()),
      dropoff_address: JSON.stringify(params.destino),
      manifest_total_value: toUberAmount(params.valorPedido),
    },
  });

  return {
    id: data.id,
    fee: fromUberAmount(data.fee ?? 0),
    etaMinutes: typeof data.duration === "number" ? data.duration : null,
    expiresAt: data.expires ?? null,
  };
}

/** Crea el envío. Se llama recién cuando el pago está confirmado. */
export async function crearEnvio(params: {
  quoteId: string;
  destino: UberAddress;
  clienteNombre: string;
  clienteTelefono: string;
  items: ManifestItem[];
  /** Id de la orden, para poder cruzar el envío con el pedido. */
  referenciaExterna: string;
  notas?: string;
}): Promise<UberDelivery> {
  const data = await uberFetch("/deliveries", {
    method: "POST",
    body: {
      quote_id: params.quoteId,
      pickup_name: BUSINESS.name,
      pickup_address: JSON.stringify(direccionRetiro()),
      pickup_phone_number: BUSINESS.phoneE164,
      pickup_business_name: BUSINESS.legalName,
      dropoff_name: params.clienteNombre,
      dropoff_address: JSON.stringify(params.destino),
      dropoff_phone_number: params.clienteTelefono,
      dropoff_notes: params.notas || undefined,
      manifest_items: params.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        size: "small",
        price: item.price !== undefined ? toUberAmount(item.price) : undefined,
      })),
      external_id: params.referenciaExterna,
    },
  });

  return {
    id: data.id,
    status: data.status,
    trackingUrl: data.tracking_url ?? null,
    fee: fromUberAmount(data.fee ?? 0),
  };
}

/** Consulta el estado de un envío. Respaldo por si se pierde un webhook. */
export async function consultarEnvio(deliveryId: string): Promise<UberDelivery> {
  const data = await uberFetch(`/deliveries/${deliveryId}`, { method: "GET" });
  return {
    id: data.id,
    status: data.status,
    trackingUrl: data.tracking_url ?? null,
    fee: fromUberAmount(data.fee ?? 0),
  };
}

/** Cancela un envío. */
export async function cancelarEnvio(deliveryId: string): Promise<void> {
  await uberFetch(`/deliveries/${deliveryId}/cancel`, { method: "POST" });
}
