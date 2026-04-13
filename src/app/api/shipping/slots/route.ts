import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { format, addDays, getHours } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";

const MAX_ORDERS_PER_SLOT = 5;
const TIMEZONE = "America/Santiago";

// Definición de franjas horarias
const TIME_SLOTS = [
  { id: "09:00-12:00", label: "09:00 - 12:00 hrs", startHour: 9 },
  { id: "12:00-15:00", label: "12:00 - 15:00 hrs", startHour: 12 },
  { id: "15:00-18:00", label: "15:00 - 18:00 hrs", startHour: 15 },
  { id: "18:00-21:00", label: "18:00 - 21:00 hrs", startHour: 18 },
];

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
    
    // Obtenemos los pedidos pendientes (que ya fueron agendados)
    // Para simplificar, traemos aquellos de los últimos 7 días con status no cancelado.
    // Esto es manejable y evitaremos queries complejas con JSON en Supabase JS client.
    const sevenDaysAgo = addDays(nowUtc, -7).toISOString();
    const { data: activeOrders, error } = await supabaseAdmin
      .from("orders")
      .select("shipping_address")
      .gte("created_at", sevenDaysAgo)
      .neq("status", "cancelled");

    if (error) {
      console.error("Error fetching active orders for slots:", error);
      return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 });
    }

    // Conteo de ocupación por slot en la fecha solicitada
    const slotCounts: Record<string, number> = {};
    activeOrders.forEach(order => {
      const addr = order.shipping_address as any;
      if (addr && addr.deliveryDate === requestedDateStr && addr.deliveryTimeSlot) {
        slotCounts[addr.deliveryTimeSlot] = (slotCounts[addr.deliveryTimeSlot] || 0) + 1;
      }
    });

    // Lógica principal
    const isToday = requestedDateStr === todayStr;
    const isAfter1PM = currentHour >= 13;
    
    const availableSlots = TIME_SLOTS.map(slot => {
      const currentCount = slotCounts[slot.id] || 0;
      const hasCapacity = currentCount < MAX_ORDERS_PER_SLOT;
      
      let isAvailable = hasCapacity;

      // Filtrado para "Mismo Día"
      if (isToday) {
         if (isAfter1PM) {
           // Si es hoy y pasó la 1 PM, NINGÚN slot está disponible
           isAvailable = false;
         } else {
           // Si es hoy y antes de la 1 PM, SOLO el último bloque (18-21) está disponible.
           isAvailable = slot.id === "18:00-21:00" && hasCapacity;
         }
      }

      return {
        id: slot.id,
        label: slot.label,
        available: isAvailable,
        capacityRatio: `${currentCount}/${MAX_ORDERS_PER_SLOT}`
      };
    });

    return NextResponse.json({
      date: requestedDateStr,
      slots: availableSlots
    });

  } catch (error: any) {
    console.error("Slots API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
