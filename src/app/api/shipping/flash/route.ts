/**
 * Cotiza el envío flash para el checkout.
 *
 * Cada llamada consume cuota del token de Uber, así que va con rate limit y
 * sólo se llama cuando el cliente ya escribió una dirección.
 *
 * No decide nada por su cuenta: las reglas viven en `flash-policy`, y el precio
 * que devuelve se vuelve a calcular en el servidor al crear el pedido. Lo de
 * acá es para mostrar.
 */

import { NextRequest, NextResponse } from "next/server";
import { format, getHours, getMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { supabaseServer } from "@/lib/supabase-server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { esAdmin } from "@/lib/api-auth";
import { tiendaAbierta } from "@/lib/delivery-slots";
import {
  quoteFlash,
  horarioIgnorado,
  MINIMO_FLASH_CLP_DEFAULT,
  TOPE_FLASH_CLP,
} from "@/lib/flash-policy";
import { cotizarFlash, uberDirectConfigurado } from "@/server/uber-direct.service";

const TIMEZONE = "America/Santiago";


export async function POST(request: NextRequest) {
  try {
    const { allowed, retryAfterSeconds } = rateLimit(`flash-quote:${getClientIp(request)}`, {
      limit: 20,
      windowMs: 5 * 60 * 1000,
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
      );
    }

    // Sin credenciales el flash sencillamente no existe. No es un error: la
    // tienda funciona igual con retiro y agendado.
    // El diagnóstico viaja SÓLO para administradores. Un cliente no tiene por
    // qué enterarse de cómo está configurada la tienda, y quien la administra
    // no debería tener que leer logs para saber por qué falta una opción.
    const admin = await esAdmin();
    const diagnostico = (extra: Record<string, unknown>) =>
      admin
        ? {
            diagnostico: {
              credencialesCargadas: uberDirectConfigurado(),
              ...extra,
            },
          }
        : {};

    if (!uberDirectConfigurado()) {
      return NextResponse.json({
        disponible: false,
        motivo: "no-configurado",
        ...diagnostico({
          queHacer:
            "Faltan UBER_DIRECT_CUSTOMER_ID, UBER_DIRECT_CLIENT_ID o UBER_DIRECT_CLIENT_SECRET en las variables de entorno de Production, o el deploy actual se construyó antes de cargarlas.",
        }),
      });
    }

    const { calle, comuna, lat, lng, telefono, subtotal } = await request.json();
    if (!calle || !comuna) {
      return NextResponse.json({ error: "Falta la dirección de destino." }, { status: 400 });
    }

    // Regla 3: no se llama a Uber con la tienda cerrada. Se comprueba **antes**
    // de la llamada, que es el punto de la regla — preguntar y descartar la
    // respuesta gastaría cuota igual.
    const ahora = toZonedTime(new Date(), TIMEZONE);
    const enHorario = tiendaAbierta(
      format(ahora, "yyyy-MM-dd"),
      getHours(ahora) * 60 + getMinutes(ahora)
    );

    // El dueño puede cotizar con el local cerrado: es la única forma de probar
    // el flash fuera del horario de atención, y probarlo no cuesta nada —la
    // entrega recién se crea cuando el pago se confirma—. Depende de la sesión
    // y no de un dato del navegador, así que un cliente no puede activarlo.
    const probandoComoAdmin = !enHorario && admin;
    const abierta = enHorario || probandoComoAdmin || horarioIgnorado();

    if (!abierta) {
      return NextResponse.json({
        disponible: false,
        motivo: "tienda-cerrada",
        ...diagnostico({ horaLocal: format(ahora, "HH:mm"), tiendaAbierta: false }),
      });
    }

    const { data: settings } = await supabaseServer
      .from("settings")
      .select("*")
      .eq("id", true)
      .maybeSingle();

    // La columna del mínimo del flash puede no existir todavía (migración sin
    // aplicar): se cae al valor de fábrica en vez de romper el checkout.
    const minimoFlash =
      settings?.free_shipping_enabled === true
        ? Number(settings?.free_shipping_minimum_flash ?? MINIMO_FLASH_CLP_DEFAULT) ||
          MINIMO_FLASH_CLP_DEFAULT
        : null;

    let cotizacion: Awaited<ReturnType<typeof cotizarFlash>>;
    try {
      cotizacion = await cotizarFlash({ calle, comuna, lat, lng, telefono });
    } catch (e) {
      // Uber caído, sin red o credenciales malas. La opción desaparece y el
      // cliente sigue comprando con las otras dos: no se lo bloquea por esto.
      console.error("[flash] no se pudo cotizar:", e);
      return NextResponse.json({
        disponible: false,
        motivo: "uber-no-responde",
        ...diagnostico({
          error: e instanceof Error ? e.message : "error desconocido",
          queHacer:
            "Uber rechazó la conexión. Suele ser un Client ID, Client Secret o Customer ID incorrecto, o credenciales de prueba usadas contra el entorno de producción.",
        }),
      });
    }

    const quote = quoteFlash({
      costoUber: cotizacion ? cotizacion.costoCLP : null,
      subtotal: Number(subtotal) || 0,
      freeShippingMinimum: minimoFlash,
      tiendaAbierta: true,
    });

    return NextResponse.json({
      ...quote,
      // Se informa para que no pase inadvertido que la tienda está cerrada y
      // el flash se está ofreciendo igual.
      modoPrueba: probandoComoAdmin || horarioIgnorado() || undefined,
      etaMin: cotizacion?.etaMin ?? null,
      ...diagnostico({
        horaLocal: format(ahora, "HH:mm"),
        tiendaAbierta: enHorario,
        costoUberCLP: cotizacion?.costoCLP ?? null,
        topeVigente: TOPE_FLASH_CLP,
      }),
      // El id se guarda para crear la entrega con el pago confirmado y para
      // poder revalidar contra la misma cotización.
      quoteId: quote.disponible ? cotizacion?.quoteId ?? null : null,
      expira: cotizacion?.expira ?? null,
    });
  } catch (error: unknown) {
    console.error("[flash] error inesperado:", error);
    return NextResponse.json({ disponible: false, motivo: "uber-no-responde" }, { status: 200 });
  }
}
