import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { format, addDays, getHours, getMinutes } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  MAX_ORDERS_PER_SLOT,
  economicoSlotEsValido,
  sameDaySlotIsAllowed,
  slotMatches,
  slotsEconomicosForDate,
  slotsForDate,
} from "@/lib/delivery-slots";

const TIMEZONE = "America/Santiago";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDateStr = searchParams.get("date"); // YYYY-MM-DD
    // Las dos modalidades no comparten grilla: el despacho programado usa los
    // bloques de tres horas de la jornada, y el económico la ronda de reparto
    // del dueño. Pedir los de una y agendar en la otra ofrecería horarios en
    // los que no sale nadie.
    const esEconomico = searchParams.get("mode") === "economico";

    if (!requestedDateStr) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    // Obtener la hora actual en Chile
    const nowUtc = new Date();
    const nowInChile = toZonedTime(nowUtc, TIMEZONE);
    const currentHour = getHours(nowInChile);
    // El corte del económico es 22:30, así que no alcanza con la hora entera.
    const nowMin = currentHour * 60 + getMinutes(nowInChile);
    const todayStr = format(nowInChile, "yyyy-MM-dd");

    // Los bloques dependen del día: el local cierra 20:30 entre semana y
    // 18:00 los fines de semana, así que no son los mismos cuatro siempre.
    const slotsDelDia = esEconomico
      ? slotsEconomicosForDate(requestedDateStr)
      : slotsForDate(requestedDateStr);
    if (slotsDelDia.length === 0) {
      return NextResponse.json({ date: requestedDateStr, slots: [] });
    }

    // Obtenemos los pedidos pendientes (que ya fueron agendados)
    // Para simplificar, traemos aquellos de los últimos 7 días con status no cancelado.
    // Esto es manejable y evitaremos queries complejas con JSON en Supabase JS client.
    const sevenDaysAgo = addDays(nowUtc, -7).toISOString();
    const { data: activeOrders, error } = await supabaseServer
      .from("orders")
      .select("shipping_address")
      .gte("created_at", sevenDaysAgo)
      .neq("status", "cancelled");

    if (error) {
      console.error("Error fetching active orders for slots:", error);
      return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
    }

    const agendados = activeOrders
      .map((order) => order.shipping_address as any)
      .filter((addr) => addr && addr.deliveryDate === requestedDateStr);

    const isToday = requestedDateStr === todayStr;

    const availableSlots = slotsDelDia.map((slot) => {
      const currentCount = agendados.filter((addr) =>
        slotMatches(slot, addr.deliveryTimeSlot)
      ).length;
      const hasCapacity = currentCount < MAX_ORDERS_PER_SLOT;

      // El económico no tiene regla de "mismo día": tiene su propio corte, que
      // depende del turno en que el pedido se prepara y no de la fecha pedida.
      const isAvailable = esEconomico
        ? hasCapacity && economicoSlotEsValido(requestedDateStr, slot.id, todayStr, nowMin)
        : isToday
          ? hasCapacity && sameDaySlotIsAllowed(slot, slotsDelDia, currentHour)
          : hasCapacity;

      return {
        id: slot.id,
        label: slot.label,
        available: isAvailable,
        capacityRatio: `${currentCount}/${MAX_ORDERS_PER_SLOT}`,
      };
    });

    return NextResponse.json({
      date: requestedDateStr,
      slots: availableSlots,
    });

  } catch (error: any) {
    console.error("Slots API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
