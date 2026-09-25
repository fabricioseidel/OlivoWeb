/**
 * Datos completos de la dirección que el cliente eligió.
 *
 * Existe porque el autocompletado de Google devuelve sólo texto: las
 * coordenadas y la comuna llegan acá. Se llama **una vez por dirección
 * elegida**, nunca por predicción — pedir el detalle de cada sugerencia
 * mientras el cliente escribe multiplicaría el costo por cada tecla.
 *
 * Las direcciones de Nominatim no pasan por acá: ya vienen completas.
 */

import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { detalleDeLugar, googlePlacesConfigurado } from "@/server/google-places.service";

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("placeId");
  const session = request.nextUrl.searchParams.get("session") || "";

  if (!placeId) {
    return NextResponse.json({ error: "Falta placeId" }, { status: 400 });
  }

  const { allowed, retryAfterSeconds } = rateLimit(`address-details:${getClientIp(request)}`, {
    limit: 30,
    windowMs: 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta más tarde." },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  if (!googlePlacesConfigurado()) {
    return NextResponse.json({ error: "Buscador de Google no configurado" }, { status: 503 });
  }

  try {
    const lugar = await detalleDeLugar(placeId, session);
    if (!lugar) {
      return NextResponse.json({ error: "Lugar no encontrado" }, { status: 404 });
    }
    return NextResponse.json(lugar);
  } catch (e) {
    console.error("[address/details] error:", e);
    // El checkout se queda con el texto de la predicción: sin comuna ni
    // coordenadas, pero con la dirección que el cliente escribió.
    return NextResponse.json({ error: "No se pudo obtener el detalle" }, { status: 502 });
  }
}
