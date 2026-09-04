/**
 * Buscador de direcciones con Google Places (API New).
 *
 * Existe por una limitación de datos, no de código: OpenStreetMap casi no tiene
 * numeración domiciliaria chilena, así que Nominatim encuentra la calle pero
 * nunca el número. Google sí la tiene.
 *
 * Todo pasa por el servidor: la clave nunca llega al navegador, que es la única
 * forma de que no te la roben y te gasten la cuota.
 *
 * ── Sobre el costo ────────────────────────────────────────────────────────
 * Autocomplete se cobra **por sesión** cuando se manda un `sessionToken`, no
 * por tecla apretada. Una sesión es: todo lo que el cliente escribe + el
 * Detalle del lugar que elige. Sin el token, cada pulsación es un cobro
 * aparte — es la causa clásica de una boleta absurda.
 *
 * Por eso acá el token es obligatorio en la práctica y el Detalle se pide
 * **sólo cuando el cliente elige una sugerencia**, jamás para cada predicción.
 *
 * El tope duro NO va en este archivo: va en la consola de Google Cloud, como
 * límite de cuota diaria por API. Una alerta de presupuesto sólo manda un
 * correo mientras el cobro sigue corriendo; la cuota corta y devuelve error.
 */

import { BUSINESS } from "@/lib/seo/business";

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const DETALLE_URL = "https://places.googleapis.com/v1/places";
const TIMEOUT_MS = 6000;

/** Radio del sesgo alrededor del local, en metros. Cubre el Gran Santiago. */
const RADIO_SESGO_M = 30000;

export function googlePlacesConfigurado(): boolean {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

/**
 * La forma que ya consumía el checkout, heredada de Nominatim.
 *
 * Se conserva a propósito: `elegirComuna` y `componerLineaDeCalle` están
 * escritas contra estos campos y funcionan igual de bien con datos de Google.
 */
export type SugerenciaDireccion = {
  place_id: string;
  display_name: string;
  address: Record<string, string>;
  lat?: string;
  lon?: string;
  fuente: "google" | "nominatim";
  /** Google devuelve sólo texto: las coordenadas y la comuna llegan al elegir. */
  necesitaDetalle?: boolean;
};

function clave(): string {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error("GOOGLE_MAPS_API_KEY no está configurada");
  return k;
}

/** Predicciones para lo que el cliente va escribiendo. */
export async function autocompletar(
  entrada: string,
  sessionToken: string
): Promise<SugerenciaDireccion[]> {
  const r = await fetch(AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": clave(),
    },
    body: JSON.stringify({
      input: entrada,
      includedRegionCodes: ["cl"],
      languageCode: "es",
      // Sesgo, no filtro: una dirección de regiones se sigue encontrando.
      locationBias: {
        circle: {
          center: {
            latitude: BUSINESS.geo.latitude,
            longitude: BUSINESS.geo.longitude,
          },
          radius: RADIO_SESGO_M,
        },
      },
      sessionToken,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!r.ok) {
    const detalle = (await r.text()).slice(0, 300);
    throw new Error(`Google Places autocomplete HTTP ${r.status} — ${detalle}`);
  }

  const json = await r.json();
  const sugerencias: any[] = Array.isArray(json?.suggestions) ? json.suggestions : [];

  return sugerencias
    .map((s) => s?.placePrediction)
    .filter((p) => p?.placeId)
    .map((p) => ({
      place_id: String(p.placeId),
      display_name: String(p.text?.text ?? "").trim(),
      address: {},
      fuente: "google" as const,
      necesitaDetalle: true,
    }))
    .filter((s) => s.display_name !== "");
}

/**
 * Datos completos del lugar elegido: coordenadas y componentes de dirección.
 *
 * El `sessionToken` tiene que ser el **mismo** del autocompletado: es lo que
 * cierra la sesión y hace que todo se cobre como una sola.
 */
export async function detalleDeLugar(
  placeId: string,
  sessionToken: string
): Promise<SugerenciaDireccion | null> {
  const url = new URL(`${DETALLE_URL}/${encodeURIComponent(placeId)}`);
  url.searchParams.set("languageCode", "es");
  url.searchParams.set("sessionToken", sessionToken);

  const r = await fetch(url.toString(), {
    headers: {
      "X-Goog-Api-Key": clave(),
      // La máscara acota qué se pide y con eso el tramo de precio: sin ella
      // Google cobra el lugar completo.
      "X-Goog-FieldMask": "id,formattedAddress,addressComponents,location",
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!r.ok) {
    const detalle = (await r.text()).slice(0, 300);
    throw new Error(`Google Places details HTTP ${r.status} — ${detalle}`);
  }

  const p = await r.json();
  if (!p?.id) return null;

  return {
    place_id: String(p.id),
    display_name: String(p.formattedAddress ?? "").trim(),
    address: mapearComponentes(p.addressComponents),
    lat: typeof p.location?.latitude === "number" ? String(p.location.latitude) : undefined,
    lon: typeof p.location?.longitude === "number" ? String(p.location.longitude) : undefined,
    fuente: "google",
  };
}

/**
 * Traduce los componentes de Google a los nombres de campo de Nominatim.
 *
 * En Chile la comuna no está siempre en el mismo componente: a veces es
 * `locality` ("Ñuñoa") y a veces `administrative_area_level_3`. Por eso se
 * rellenan todos los campos que `elegirComuna` sabe revisar, y esa función
 * elige el primero que sea una comuna que atendemos — la misma estrategia que
 * ya se usaba con OpenStreetMap.
 */
export function mapearComponentes(componentes: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(componentes)) return out;

  const equivalencias: Record<string, string> = {
    street_number: "house_number",
    route: "road",
    sublocality: "suburb",
    sublocality_level_1: "suburb",
    administrative_area_level_3: "municipality",
    locality: "city",
    administrative_area_level_2: "county",
    administrative_area_level_1: "state",
    postal_code: "postcode",
    country: "country",
  };

  for (const c of componentes) {
    const texto = typeof c?.longText === "string" ? c.longText.trim() : "";
    if (!texto) continue;
    const tipos: string[] = Array.isArray(c?.types) ? c.types : [];
    for (const tipo of tipos) {
      const destino = equivalencias[tipo];
      // El primero gana: los componentes vienen del más específico al más
      // general y no conviene que "country" pise a "locality".
      if (destino && !out[destino]) out[destino] = texto;
    }
  }

  return out;
}
