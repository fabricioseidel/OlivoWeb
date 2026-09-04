import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { BUSINESS } from "@/lib/seo/business";

// Simple in-memory cache to reduce load on Nominatim
// Key: query string, Value: { timestamp: number, data: any }
const cache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Sesgo geográfico hacia el Gran Santiago.
 *
 * Nominatim ordena por "importancia", y con `countrycodes=cl` a secas un
 * pueblo llamado San Isidro en Quillota le gana a la calle San Isidro de
 * Santiago Centro: buscar la dirección de reparto real no devolvía ni una
 * opción en la Región Metropolitana. El viewbox no restringe (bounded=0), sólo
 * acerca: una dirección de regiones se sigue encontrando, pero después.
 */
const VIEWBOX_SANTIAGO = "-70.90,-33.20,-70.35,-33.75";

const REGION_LOCAL = "metropolitana";

function urlBusquedaLibre(q: string, country: string): URL {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("dedupe", "1");
  // Se pide de más porque después se reordena y se recorta a 6: si se pidieran
  // 6, las de Santiago podrían no venir en la primera tanda.
  url.searchParams.set("limit", "15");
  url.searchParams.set("q", q);
  url.searchParams.set("countrycodes", country);
  url.searchParams.set("viewbox", VIEWBOX_SANTIAGO);
  url.searchParams.set("bounded", "0");
  url.searchParams.set("accept-language", "es");
  return url;
}

/**
 * Búsqueda estructurada para "Calle 1234".
 *
 * En Chile el número va al final; Nominatim espera el formato
 * "<número> <calle>" en el campo `street`. Escrito como texto libre, el
 * número suele hacer que la calle no aparezca en absoluto.
 */
function urlBusquedaEstructurada(q: string, country: string): URL | null {
  const m = q.trim().match(/^(.+?)[\s,]+(\d{1,6})[a-zA-Z]?$/);
  if (!m) return null;
  const [, calle, numero] = m;
  if (calle.trim().length < 3) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("dedupe", "1");
  url.searchParams.set("limit", "10");
  url.searchParams.set("street", `${numero} ${calle.trim()}`);
  url.searchParams.set("countrycodes", country);
  url.searchParams.set("viewbox", VIEWBOX_SANTIAGO);
  url.searchParams.set("bounded", "0");
  url.searchParams.set("accept-language", "es");
  return url;
}

/**
 * Clave de identidad de un resultado.
 *
 * No sirve `place_id`: es un id interno del índice de Nominatim y el **mismo**
 * objeto de OpenStreetMap vuelve con un `place_id` distinto en cada consulta.
 * Al fusionar la búsqueda libre con la estructurada, "Av. José Pedro
 * Alessandri 2010" salía cuatro veces en la lista. El par osm_type + osm_id sí
 * identifica al objeto; el `display_name` cubre el resto, porque dos portales
 * distintos del mismo edificio son, para quien elige, la misma dirección.
 */
function claveDeIdentidad(item: any): string {
  if (item?.osm_type && item?.osm_id) return `${item.osm_type}:${item.osm_id}`;
  return String(item?.display_name ?? item?.place_id ?? "");
}

function dedupe(items: any[]): any[] {
  const vistos = new Set<string>();
  const out: any[] = [];
  for (const item of items) {
    const clave = claveDeIdentidad(item);
    const nombre = String(item?.display_name ?? "").trim().toLowerCase();
    if (!clave || vistos.has(clave) || (nombre && vistos.has(nombre))) continue;
    vistos.add(clave);
    if (nombre) vistos.add(nombre);
    out.push(item);
  }
  return out;
}

/**
 * Deja primero lo que se puede repartir: una dirección con calle en la Región
 * Metropolitana antes que un caserío homónimo a 150 km.
 */
function ordenarPorCercania(items: any[]): any[] {
  const puntaje = (item: any) => {
    const addr = item?.address || {};
    const estado = String(addr.state || addr.region || "").toLowerCase();
    let p = 0;
    if (estado.includes(REGION_LOCAL)) p += 2;
    // Una calle es una dirección de entrega; un pueblo o una región, no.
    if (addr.road || addr.pedestrian || addr.house_number) p += 1;
    return p;
  };
  // Orden estable: a igual puntaje se respeta el orden de Nominatim, que ya
  // viene por importancia.
  return items
    .map((item, i) => ({ item, i, p: puntaje(item) }))
    .sort((a, b) => b.p - a.p || a.i - b.i)
    .map((x) => x.item);
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q");
  const country = searchParams.get("country") || "cl";

  if (!q) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const { allowed, retryAfterSeconds } = rateLimit(`address-search:${getClientIp(request)}`, {
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  const cacheKey = `${country}:${q.toLowerCase().trim()}`;
  const now = Date.now();

  // Check cache
  if (cache.has(cacheKey)) {
    const entry = cache.get(cacheKey)!;
    if (now - entry.timestamp < CACHE_TTL) {
      return NextResponse.json(entry.data);
    } else {
      cache.delete(cacheKey);
    }
  }

  try {

    // La política de uso de Nominatim exige un User-Agent que identifique a la
    // aplicación con un contacto real y alcanzable. Antes decía
    // "TecnoOlivoWeb (contact@tecno-olivo.cl)", un marcador de posición de otro
    // dominio: si el servicio necesitaba avisar de un abuso, escribía a una
    // dirección que nadie lee, y lo que sigue a eso es un bloqueo.
    const headers = {
      "User-Agent": `OlivoMarket/1.0 (${BUSINESS.url}; ${BUSINESS.email})`,
      "Accept": "application/json",
    };

    const pedir = async (url: URL) => {
      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        throw new Error(`Nominatim API error: ${res.status} ${res.statusText}`);
      }
      const json = await res.json();
      return Array.isArray(json) ? json : [];
    };

    // Dos consultas en vez de una. La libre encuentra la calle cuando el
    // número no estorba; la estructurada es la única que Nominatim documenta
    // para direcciones con numeración, y es la que resuelve "San Isidro 292".
    const consultas = [pedir(urlBusquedaLibre(q, country))];
    const estructurada = urlBusquedaEstructurada(q, country);
    if (estructurada) consultas.push(pedir(estructurada));

    const [libres, estructurados] = await Promise.all([
      consultas[0],
      consultas[1] ?? Promise.resolve([] as any[]),
    ]);

    const data = ordenarPorCercania(dedupe([...estructurados, ...libres])).slice(0, 6);

    // Update cache
    cache.set(cacheKey, { timestamp: now, data });

    // Clean up old cache entries if too big (simple protection)
    if (cache.size > 1000) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Error fetching from Nominatim:", error);
    return NextResponse.json(
      { error: "Failed to fetch address suggestions" },
      { status: 500 }
    );
  }
}
