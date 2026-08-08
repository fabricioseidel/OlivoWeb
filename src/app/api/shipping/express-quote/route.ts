import { NextRequest, NextResponse } from "next/server";
import { format, getHours, getMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  UberDirectError,
  cotizarEnvio,
  direccionDestino,
  uberDirectConfigurado,
} from "@/lib/uber-direct/client";
import { alcanzaMinimoExpress, quoteExpress } from "@/lib/uber-direct/pricing";
import { admiteEnvioInmediato } from "@/lib/delivery-slots";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

const TIMEZONE = "America/Santiago";

/**
 * Cotiza un envío inmediato con Uber Direct.
 *
 * El secret de Uber vive solo acá: el navegador nunca habla con su API.
 *
 * La respuesta siempre es 200 con `available: false` cuando la opción no
 * corresponde (fuera de horario, bajo el mínimo, sin cobertura). Para el
 * checkout no son errores — son razones para no mostrar la opción.
 */
export async function POST(request: NextRequest) {
  const { allowed, retryAfterSeconds } = rateLimit(`express-quote:${getClientIp(request)}`, {
    limit: 20,
    windowMs: 5 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { available: false, reason: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  if (!uberDirectConfigurado()) {
    return NextResponse.json({ available: false, reason: "not_configured" });
  }

  try {
    const body = await request.json();
    const { address, city, state, zipCode, apartment, tower, subtotal } = body ?? {};

    if (!address || !city) {
      return NextResponse.json({ available: false, reason: "incomplete_address" });
    }

    const subtotalNum = Number(subtotal);
    if (!Number.isFinite(subtotalNum) || !alcanzaMinimoExpress(subtotalNum)) {
      return NextResponse.json({ available: false, reason: "below_minimum" });
    }

    // Fuera del horario de atención no hay quien entregue el pedido al
    // repartidor, así que la opción no se ofrece.
    const ahora = toZonedTime(new Date(), TIMEZONE);
    const minutosDelDia = getHours(ahora) * 60 + getMinutes(ahora);
    if (!admiteEnvioInmediato(format(ahora, "yyyy-MM-dd"), minutosDelDia)) {
      return NextResponse.json({ available: false, reason: "closed" });
    }

    const quote = await cotizarEnvio({
      destino: direccionDestino({ address, city, state, zipCode, apartment, tower }),
      valorPedido: subtotalNum,
    });

    const pricing = quoteExpress({ uberFee: quote.fee, subtotal: subtotalNum });

    return NextResponse.json({
      available: true,
      price: pricing.price,
      paidByStore: pricing.paidByStore,
      etaMinutes: quote.etaMinutes,
    });
  } catch (error) {
    if (error instanceof UberDirectError && error.esFaltaDeCobertura) {
      return NextResponse.json({ available: false, reason: "no_coverage" });
    }

    // Cualquier otra cosa sí es una falla nuestra o de la API: se registra y
    // el checkout sigue con las opciones que ya tenía.
    console.error("[Uber Direct] Error cotizando envío:", error);
    return NextResponse.json({ available: false, reason: "error" });
  }
}
