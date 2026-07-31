import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { format, addDays, getHours } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  MAX_ORDERS_PER_SLOT,
  sameDaySlotIsAllowed,
  slotMatches,
  slotsForDate,
} from "@/lib/delivery-slots";

const TIMEZONE = "America/Santiago";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const requestedDateStr = searchParams.get("date"); // YYYY-MM-DD

    if (!requestedDateStr) {
      return NextResponse.json({ error: "Date parameter is required" }, { status: 400 });
    }

    // Obtener la hora actual en Chile
    const nowUtc = new Date();
    const nowInChile = toZonedTime(nowUtc, TIMEZONE);
    const currentHour = getHours(nowInChile);
    const todayStr = format(nowInChile, "yyyy-MM-dd");

    // Los bloques dependen del día: el local cierra 20:30 entre semana y
    // 18:00 los fines de semana, así que no son los mismos cuatro siempre.
    const slotsDelDia = slotsForDate(requestedDateStr);
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

      const isAvailable = isToday
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
